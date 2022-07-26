'use strict';
const _ = require('lodash');
const UserRentals = require('../models/UserRentals');
const logger = require('../util/pinologger');
const splinterlandsService = require('./splinterlands');
const hiveService = require('./hive');
const utilDates = require('../util/dates');
const findCardLevel = require('../util/calculateCardLevel');

const updateRentalsInDb = async ({ username, users_id, cardDetailsObj }) => {
    try {
        logger.debug('/services/rentals/allAccountUpdate/updateRentalsInDB');

        const activeRentals = await splinterlandsService
            .getActiveRentals({ username })
            .catch((err) => {
                logger.error(
                    `/services/rentals/allAccountUpdate/updateRentalsInDB getActiveRentals with users_id: ${users_id} error: ${err.message}`
                );
                throw err;
            });

        const newActiveRentals = cleanAPIActiveRentals({ activeRentals });

        const dbActiveRentals = await getActiveRentalsInDB({ users_id }).catch(
            (err) => {
                logger.error(
                    `/services/rentals/allAccountUpdate/updateRentalsInDB getActiveRentalsInDB with users_id: ${users_id} error: ${err.messsage}`
                );
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
            cardDetailsObj,
        });

        logger.debug(
            `rentalsAlreadyInserted: ${JSON.stringify(rentalsAlreadyInserted)}`
        );
        logger.debug(`rentalsToInsert: ${JSON.stringify(rentalsToInsert)}`);

        await insertActiveRentals({ rentals: rentalsToInsert }).catch((err) => {
            logger.error(
                `/services/rentals/allAccountUpdate/updateRentalsInDb insertActiveRentals with rentals: ${JSON.stringify(
                    rentalsToInsert
                )} error: ${err.message}`
            );
            throw err;
        });
        logger.info(
            '/services/rentals/allAccountUpdate/updateRentalsInDB done'
        );

        return;
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/updateRentalsInDb error: ${err.message}`
        );
        throw err;
    }
};

const insertActiveRentals = async ({ rentals }) => {
    try {
        logger.debug('/services/rentals/allAccountUpdate/insertActiveRentals');

        if (rentals.length === 0) {
            logger.info(
                `/services/rentals/allAccountUpdate/insertActiveRentals no rentals to insert`
            );
            return;
        }
        let chunks = rentals;
        if (rentals.length > 1000) {
            chunks = _.chunk(rentals, 1000);
        }

        if (chunks.length === rentals.length) {
            chunks = [chunks];
        }
        for (const rentalChunk of chunks) {
            await UserRentals.query()
                .insert(rentalChunk)
                .catch((err) => {
                    logger.error(
                        `/services/rentals/allAccountUpdate/insertActiveRentals UserRentals table insert fail on rentals: ${JSON.stringify(
                            rentals
                        )}, rentalChunk: ${JSON.stringify(
                            rentalChunk
                        )} error: ${err.message}`
                    );
                    throw err;
                });
        }

        logger.info(
            `/services/rentals/allAccountUpdate/insertActiveRentals done`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/insertActiveRentals error: ${err.message}`
        );
        throw err;
    }
};

const getActiveRentalsInDB = async ({ users_id }) => {
    try {
        logger.debug('/services/rentals/allAccountUpdate/getActiveRentalsInDB');

        const now = new Date();
        // this is due to some lag on splinterlands api where an active_rental that expired doesn't get expired from the api immediately
        const oneAndAHalf = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 1.5,
            date: now,
        });

        const dbActiveRentals = await UserRentals.query()
            .where({ users_id })
            .whereBetween('last_rental_payment', [oneAndAHalf.daysAgo, now])
            .catch((err) => {
                logger.error(
                    `/services/rentals/allAccountUpdate/getActiveRentalsInDB UserRentals query with users_id: ${users_id}, now: ${now} and oneDayAgo: ${oneDayAgo} error: ${err.message}`
                );
                throw err;
            });

        logger.debug(
            `/services/rentals/allAccountUpdate/getActiveRentalsInDB done, dbActiveRentals: ${JSON.stringify(
                dbActiveRentals
            )} `
        );
        logger.info(
            `/services/rentals/allAccountUpdate/getActiveRentalsInDB done`
        );
        return dbActiveRentals;
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/getActiveRentalsInDB error: ${err.message}`
        );
        throw err;
    }
};

// converts an array of active_rentals into an object that you can search for a rental by the card_uid of the card rented out
const searchableByUidDBRentals = ({ rentals }) => {
    try {
        logger.debug(
            '/services/rentals/allAccountUpdate/searchableByUidDBRentals'
        );

        const rentalsObj = {};
        rentals.forEach((rental) => {
            rentalsObj[rental.card_uid] = rental;
        });

        logger.info(
            '/services/rentals/allAccountUpdate/searchableByUidDBRentals done'
        );
        return rentalsObj;
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/searchableByUidDBRentals error: ${err.message}`
        );
        throw err;
    }
};

const cleanAPIActiveRentals = ({ activeRentals }) => {
    try {
        logger.debug(
            '/services/rentals/allAccountUpdate/cleanAPIActiveRentals'
        );

        activeRentals.forEach((rental) => {
            const { oneDayAgo, oneDayAgoInMS } = utilDates.getOneDayAgo({
                date: rental.next_rental_payment,
            });

            rental.buy_price = parseFloat(rental.buy_price);
            rental.last_rental_payment = oneDayAgo;
        });

        logger.info(
            '/services/rentals/allAccountUpdate/cleanAPIActiveRentalsdone'
        );

        return activeRentals;
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/cleanAPIActiveRentalsdone error: ${err.message}`
        );
        throw err;
    }
};

const filterIfInDB = ({
    newActiveRentals,
    dbRentalsByUid,
    users_id,
    cardDetailsObj,
}) => {
    try {
        logger.debug('/services/rentals/allAccountUpdate/filterIfInDB');

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
            const card_details = cardDetailsObj[rental.card_detail_id];
            logger.debug(
                `card_details output for card_detail_id: ${
                    rental.card_detail_id
                } is: ${JSON.stringify(card_details)}`
            );
            const level = findCardLevel({
                id: rental.card_detail_id,
                rarity: card_details.rarity,
                _xp: rental.xp,
                gold: rental.gold,
                edition: card_details.edition,
                tier: rental.tier,
                alpha_xp: 0,
            });
            const rentalToAdd = {
                users_id,
                rented_at: new Date(rental.rental_date),
                next_rental_payment,
                last_rental_payment,
                edition: rental.edition,
                card_detail_id: rental.card_detail_id,
                level,
                xp: rental.xp,
                price: Number(rental.buy_price),
                is_gold: rental.gold,
                card_uid,
                player_rented_to: rental.renter,
                rental_tx: rental.rental_tx,
                sell_trx_id: rental.sell_trx_id,
            };
            const matchedRental = dbRentalsByUid[card_uid];

            if (matchedRental != null) {
                logger.debug('matchedRental is not null');
                // there was a match
                if (
                    matchedRental.rental_tx === rental.rental_tx &&
                    matchedRental.sell_trx_id === rental.sell_trx_id
                ) {
                    logger.debug(
                        'matchedRental rental_tx and sell_trx = rental.rental_tx and sell_trx_id'
                    );
                    const matchedNextRentPmnt = new Date(
                        matchedRental.next_rental_payment
                    ).getTime();
                    const rentalNextRentPmnt = new Date(
                        rental.next_rental_payment
                    ).getTime();

                    if (matchedNextRentPmnt === rentalNextRentPmnt) {
                        logger.debug(
                            `matchedRental next_rental_payment (in ms): ${matchedNextRentPmnt} === rental.next_rental_payment: ${rentalNextRentPmnt} with same rental_tx and sell_trx_id`
                        );
                        rentalsAlreadyInserted.push(rentalToAdd);
                    } else {
                        logger.debug(
                            `we have a continuiation of an existing rental contract`
                        );
                        rentalsToInsert.push(rentalToAdd);
                    }
                } else {
                    // this happens when there is a uid match but the rental_tx and sell_trx_id are different
                    rentalsToInsert.push(rentalToAdd);
                }
            } else {
                // there was no match, need to insert this into the db
                rentalsToInsert.push(rentalToAdd);
            }
        });

        logger.debug(`rentalsToInsert: ${JSON.stringify(rentalsToInsert)}`);
        logger.info('/services/rentals/allAccountUpdate/filterIfInDB done');
        return {
            rentalsToInsert,
            rentalsAlreadyInserted,
            rentalsThatMightCrossover,
        };
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/filterIfInDB error: ${err.message}`
        );
        throw err;
    }
};

const patchRentalsBySplintersuite = async ({ users_id }) => {
    try {
        const now = new Date();
        const sixHoursAgo = new Date(new Date().getTime() - 1000 * 60 * 60 * 6);
        const rentals = await UserRentals.query()
            .where({ users_id })
            .whereBetween('next_rental_payment', [sixHoursAgo, now]);
        const transactionIds = _.uniq(
            rentals.map(({ sell_trx_id }) => sell_trx_id.split('-')[0])
        );
        for (const transactionId of transactionIds) {
            const transaction = await hiveService.getHiveTransaction({
                transactionId,
            });
            if (transaction?.agent === 'splintersuite') {
                await UserRentals.query()
                    .where({ users_id })
                    .where('sell_trx_id', 'like', `${transactionId}%`)
                    .patch({ confirmed: true });
            }
        }
    } catch (err) {
        logger.error(
            `/services/rentals/patchRentalsBySplintersuite error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    updateRentalsInDb,
    patchRentalsBySplintersuite,
};
