'use strict';
const _ = require('lodash');
const UserRentals = require('../../models/UserRentals');
const logger = require('../../util/pinologger');
const splinterlandsService = require('../../services/splinterlands');
const utilDates = require('../../util/dates');
const calculateCardLevel = require('../../util/calculateCardLevel');
const findCardLevel = require('../../util/calculateCardLevel');

const updateRentalsInDb = async ({ username, users_id }) => {
    try {
        logger.debug('/services/rentals/tntAllAccountUpdate/updateRentalsInDB');

        const activeRentals = await splinterlandsService
            .getActiveRentals({ username })
            .catch((err) => {
                logger.error(`getActiveRentals error: ${err.message}`);
                throw err;
            });

        const newActiveRentals = cleanAPIActiveRentals({ activeRentals });

        const dbActiveRentals = await getActiveRentalsInDB({ users_id }).catch(
            (err) => {
                logger.error(`getActiveRentalsInDB error: ${err.messsage}`);
                throw err;
            }
        );

        const dbRentalsByUid = searchableByUidDBRentals({
            rentals: dbActiveRentals,
        });

        const { rentalsToInsert, rentalsAlreadyInserted } = filterIfInDB({
            newActiveRentals,
            dbRentalsByUid,
            users_id,
        });

        logger.info(
            `rentalsALreadyInserted: ${JSON.stringify(rentalsAlreadyInserted)}`
        );
        logger.info(`rentalsToInsert: ${JSON.stringify(rentalsToInsert)}`);

        // we need to first look up if the listings exist for the rentalsToInsert, then we can move from there
        if (rentalsToInsert.length > 0) {
            await UserRentals.query().insert(rentalsToInsert);
        }

        logger.info(
            '/services/rentals/tntAllAccountUpdate/updateRentalsInDB done'
        );

        return;
    } catch (err) {
        logger.error(
            `/services/rentals/tntAllAccountUpdate/updateRentalsInDb error: ${err.message}`
        );
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
            .where({ users_id })
            .whereBetween('last_rental_payment', [oneDayAgo, now]);

        logger.info(
            '/services/rentals/tntAllAccountUpdate/getActiveRentalsInDB done'
        );
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

const filterIfInDB = ({ newActiveRentals, dbRentalsByUid, users_id }) => {
    try {
        logger.debug('/services/rentals/tntAllAccountUpdate/filterIfInDB');

        const rentalsToInsert = [];
        const rentalsAlreadyInserted = [];
        const rentalsThatMightCrossover = [];

        newActiveRentals.forEach((rental) => {
            // APIRental.card_id = card.uid from collection API, both saved to card_uid column
            const card_uid = rental.card_id;
            const next_rental_payment = new Date(rental.next_rental_payment);
            const { oneDayAgo } = utilDates.getOneDayAgo({
                date: next_rental_payment,
            });
            const last_rental_payment = oneDayAgo;
            // findCardLevel = ({ id, rarity, _xp, gold, edition, tier, alpha_xp }) => {
            const level = findCardLevel({
                id: rental.card_detail_id,
                rarity: 'xdww',
                _xp: rental.xp,
                gold: rental.gold,
                edition: rental.edition,
                tier: 'xdww',
                alpha_xp: 0,
            });
            const rentalToAdd = {
                users_id,
                rented_at: new Date(rental.rental_date),
                next_rental_payment,
                last_rental_payment,
                edition: rental.edition,
                card_detail_id: rental.card_detail_id,
                sell_trx_id: rental.sell_trx_id,
                rental_tx: rental.rental_tx,
                price: Number(rental.buy_price),

                player_rented_to: rental.renter,

                card_uid,

                // user_rental_listing_id
            };
            const matchedRental = dbRentalsByUid[card_uid];
            if (matchedRental != null) {
                // there was a match
                if (
                    matchedRental.rental_tx === rental.rental_tx &&
                    matchedRental.sell_trx_id === rental.sell_trx_id
                ) {
                    rentalsAlreadyInserted.push(rentalToAdd);
                } else {
                    // seems like we should
                    rentalsThatMightCrossover.push(rentalToAdd);
                }
            } else {
                // there was no match, need to insert this into the db
                rentalsToInsert.push(rentalToAdd);
            }
        });
        logger.info('filterIfInDb done');

        return {
            rentalsToInsert,
            rentalsAlreadyInserted,
            rentalsThatMightCrossover,
        };
    } catch (err) {
        logger.error(`filterIfInDB error: ${err.message}`);
        throw err;
    }
};

module.exports = {
    updateRentalsInDb,
};
