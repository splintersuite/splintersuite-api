'use strict';
const _ = require('lodash');
const UserRentalListings = require('../../models/UserRentalListings');
const UserRentals = require('../../models/UserRentals');
const logger = require('../../util/pinologger');
const splinterlandsService = require('../../services/splinterlands');
const utilDates = require('../../util/dates');

const updateRentalsInDB = async ({ username, users_id, cardDetailsObj }) => {
    try {
        logger.debug('/services/rentals/tntAllAccountUpdate/updateRentalsInDB');

        // skipping everything that is the listings for now
        const activeRentals = await splinterlandsService
            .getActiveRentals({ username })
            .catch((err) => {
                logger.error(`getActiveRentals error: ${err.message}`);
                throw err;
            });
        // TNT: maybe we can do this transform in another function?

        const newActiveRentals = cleanAPIActiveRentals({ activeRentals });

        const dbActiveRentals = await getActiveRentalsInDB({ users_id }).catch(
            (err) => {
                logger.error(`getActiveRentalsInDB error: ${err.messsage}`);
                throw err;
            }
        );

        const dbRentalsByUid = searchableByUidDBRentals({
            rentals: dbActiveRentals,
        }).catch((err) => {
            logger.error(`searchableByUidDBRentals error: ${err.message}`);
            throw err;
        });
        const rentalsToInsert = [];
        const rentalsAlreadyInserted = [];

        newActiveRentals.forEach((rental) => {
            // APIRental.card_id = card.uid from collection API, both saved to card_uid column
            // const result = dbActiveRentals[]
            const card_uid = rental.card_id;
            const cancelled_at =
                rental.cancel_date != null
                    ? new Date(rental.cancel_date)
                    : null;

            const next_rental_payment = new Date(rental.next_rental_payment);
            const { oneDayAgo } = utilDates.getOneDayAgo({
                date: next_rental_payment,
            });
            const last_rental_payment = oneDayAgo;
            const rentalToAdd = {
                users_id,
                sell_trx_id: rental.sell_trx_id,
                price: Number(rental.buy_price),
                rented_at: new Date(rental.rental_date),
                player_rented_to: rental.renter,
                cancelled_at,
                next_rental_payment,
                card_uid,
                last_rental_payment,
                // user_rental_listing_id
            };
            const matchedRental = dbRentalsByUid[card_uid];
            if (matchedRental != null) {
                // there was a match
                rentalsAlreadyInserted.push(rentalToAdd);
            } else {
                // there was no match, need to insert this into the db
                rentalsToInsert.push(rentalToAdd);
            }
        });

        logger.info(
            `rentalsALreadyInserted: ${JSON.stringify(rentalsAlreadyInserted)}`
        );
        logger.info(`rentalsToInsert: ${JSON.stringify(rentalsToInsert)}`);

        if (rentalsToInsert.length > 0) {
            await UserRentals.query().insert(rentalsToInsert);
        }

        logger.info('updateRentalsInDB done');

        return;

        /*  const dbActiveRentals = await UserRentals.query().where({
            users_id,
        });
        //  .whereBetween('next_rental_payment', [yesterday, tomorrow]);
        // ideally, we would use [yesterday, now] -> with last_rental_payment b.c. it had to occur within last 24 hours

        dbActiveRentals = 

        activeRentals.forEach((activeRentals) => {
          this is where we would sort out to see which already exist in the database, and which need to be added imo
        })*/
    } catch (err) {
        logger.error(`updateRentalsInDb error: ${err.message}`);
        throw err;
    }
};

const getActiveRentalsInDB = async ({ users_id }) => {
    try {
        logger.debug(
            '/services/rentals/tntAllAccountUpdate/getActiveRentalsInDB'
        );

        const now = new Date();
        const { oneDayAgo } = utilDates.getOneDayAgo({ date: now });

        const dbActiveRentals = await UserRentals.query()
            .join('user_rental_listings', {
                'user_rentals.user_rental_listing_id':
                    'user_rental_listings.id',
            })
            .select('user_rentals.*', 'user_rental_listings.card_uid')
            .where({ users_id })
            .whereBetween('last_rental_payment', [oneDayAgo, now]);

        logger.info('getActiveRentalsInDB returning dbActiveRentals: ');
        logger.info(dbActiveRentals);
        return dbActiveRentals;
    } catch (err) {
        logger.error(`getActiveRentalsInDB error: ${err.message}`);
        throw err;
    }
};

// converts an array of active_rentals into an object that you can search for a rental by the card_uid of the card rented out
const searchableByUidDBRentals = ({ rentals }) => {
    try {
        logger.debug(
            '/services/rentals/tntAllAccountUpdate/searchableByUidDBRentals'
        );
        const rentalsObj = {};
        rentals.forEach((rental) => {
            rentalsObj[rental.card_uid] = rental;
        });
        logger.info('searchableByUidDBRentals done');
        return rentalsObj;
    } catch (err) {
        logger.error(`searchableByUidDBRentals error: ${err.message}`);
        throw err;
    }
};

const cleanAPIActiveRentals = ({ activeRentals }) => {
    try {
        logger.debug(
            '/services/rentals/tntAllAccountUpdate/cleanAPIActiveRentals'
        );
        activeRentals.forEach((rental) => {
            rental.next_rental_payment_time = new Date(
                rental.next_rental_payment
            ).getTime();
            rental.buy_price = parseFloat(rental.buy_price);
            const { oneDayAgo, oneDayAgoInMS } = utilDates.getOneDayAgo({
                date: rental.next_rental_payment,
            });
            rental.last_rental_payment = oneDayAgo;
            rental.last_rental_payment_time = oneDayAgoInMS;
        });

        logger.info('cleanAPIActiveRentals done');
        return activeRentals;
    } catch (err) {
        logger.error(`cleanAPIActiveRentals error: ${err.message}`);
        throw err;
    }
};

module.exports = {
    updateRentalsInDB,
};
