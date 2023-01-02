'use strict';
const logger = require('../util/pinologger');
const _ = require('lodash');
const Users = require('../models/Users');
const UserRentals = require('../models/UserRentals');
const retryFncs = require('../util/axios_retry/general');
const splinterlandsService = require('./splinterlands');
const cardDetails = require('../util/cardDetails.json');
const utilDates = require('../util/dates');
const findCardLevel = require('../util/calculateCardLevel');

const update = async () => {
    try {
        logger.debug(`/services/userRentals/update`);
        const now = new Date();
        const nowTime = now.getTime();
        const cardDetailsObj = {};
        cardDetails.forEach((card) => {
            cardDetailsObj[card.id] = card;
        });
        const users = await Users.query();
        let count = 0;
        const fiveMinutesInMS = 1000 * 60 * 5;
        const timeSummary = {};
        for (const user of users) {
            const start = new Date();
            const startTime = start.getTime();

            logger.info(
                `/scripts/userRentals/update username: ${user.username} start: ${start}, startTime: ${startTime}`
            );
            const result = await updateRentalsInDb({
                username: user.username,
                users_id: user.id,
                cardDetailsObj,
            }).catch((err) => {
                logger.error(
                    `/services/userRentals/update .updateRentalsInDb username: ${JSON.stringify(
                        user.username
                    )} error: ${err.message}`
                );
                throw err;
            });
            const end = new Date();
            const endTime = end.getTime();
            let inserted = 0;
            let alreadyInserted = 0;

            const minsLong = utilDates.computeMinsSinceStart({
                startTime,
                endTime,
            });

            if (
                result != null &&
                result?.inserted != null &&
                result?.alreadyInserted != null
            ) {
                inserted = result?.inserted;
                alreadyInserted = result?.alreadyInserted;
            }
            timeSummary[user.username] = {
                minsLong,
                alreadyInserted,
                inserted,
            };
            logger.info(
                `/scripts/userRentals/update username: ${user.username} end: ${end}, endTime: ${endTime}, minsLong: ${minsLong}, inserted: ${inserted}, alreadyInserted: ${alreadyInserted}`
            );

            if (count !== 0 && count % 100 === 0) {
                await retryFncs.sleep(fiveMinutesInMS);
            }
            await retryFncs.sleep(1000);
            count++;
        }
        const finalEnd = new Date();
        const finalEndTime = finalEnd.getTime();
        const totalMinsLong = utilDates.computeMinsSinceStart({
            startTime: nowTime,
            endTime: finalEndTime,
        });
        timeSummary['totalMinsLong'] = totalMinsLong;
        logger.info(
            `/services/userRentals/update: ${users?.length} users, totalMinsLong: ${totalMinsLong}`
        );
        return timeSummary;
    } catch (err) {
        logger.error(`/services/userRentals/update error: ${err.message}`);
        throw err;
    }
};

const updateRentalsInDb = async ({ username, users_id, cardDetailsObj }) => {
    try {
        logger.info(
            `/services/userRentals/updateRentalsInDb user: ${username}`
        );

        const activeRentals = await splinterlandsService
            .getActiveRentals({ username })
            .catch((err) => {
                logger.error(
                    `/services/rentals/allAccountUpdate/updateRentalsInDB getActiveRentals with users_id: ${users_id} error: ${err.message}`
                );
                err.name = 'OperationalError';
                throw err; // we dont want to crash the entire script, can just move onto the next person
            });

        const transformedAPIRentals = transformAPIActiveRentals({
            activeRentals,
        });

        const activeDBRentals = await getRecentDBRentals({ users_id }).catch(
            (err) => {
                logger.error(
                    `/services/rentals/allAccountUpdate/updateRentalsInDB getRecentDbRentals users_id: ${users_id}, error: ${err.message}`
                );
                err.name = 'OperationalError';
                throw err;
            }
        );

        const dbRentalsByUid = sortDBRentalsByUid({ rentals: activeDBRentals });

        const { rentalsToInsert, rentalsAlreadyInserted } = filterIfInDB({
            transformedAPIRentals,
            dbRentalsByUid,
            users_id,
            cardDetailsObj,
        });

        await insertActiveRentals({ rentals: rentalsToInsert }).catch((err) => {
            logger.error(
                `/services/userRentals/updateRentalsInDb insertActiveRentals with rentalsToInsert: ${JSON.stringify(
                    rentalsToInsert
                )}, error: ${err.message}`
            );
            err.name = 'OperationalError';
            throw err;
        });

        logger.info(
            `/services/userRentals/updateRentalsInDb: User: ${username}`
        );

        return {
            inserted: rentalsToInsert?.length,
            alreadyInserted: rentalsAlreadyInserted?.length,
        };
    } catch (err) {
        logger.error(
            `/services/userRentals/updateRentalsInDb error: ${err.message}`
        );
        if (err?.name === 'OperationalError') {
            logger.error(
                `/services/userRentals/updateRentalsInDb operational error`
            );
            return null;
        } else {
            throw err;
        }
    }
};

const transformAPIActiveRentals = ({ activeRentals }) => {
    try {
        logger.debug(`/services/userRentals/transformAPIActiveRentals`);

        const transformedRentals = [];

        for (const rental of activeRentals) {
            const { oneDayAgo } = utilDates.getOneDayAgo({
                date: rental.next_rental_payment,
            });

            rental.buy_price = parseFloat(rental.buy_price);
            rental.last_rental_payment = oneDayAgo;
            transformedRentals.push(rental);
        }
        logger.info(
            `/services/userRentals/transformAPIActiveRentals activeRentals: ${JSON.stringify(
                activeRentals.length
            )}, transformedRentals ${JSON.stringify(transformedRentals.length)}`
        );

        return transformedRentals;
    } catch (err) {
        logger.error(
            `/services/userRentals/transformAPIActiveRentals error: ${err.message}`
        );
        throw err;
    }
};

const getRecentDBRentals = async ({ users_id }) => {
    try {
        logger.debug(`/services/userRentals/getRecentDBRentals`);
        const now = new Date();

        const oneAndAHalf = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 1.5,
            date: now,
        });

        const dbActiveRentals = await UserRentals.query()
            .where({ users_id })
            .whereBetween('last_rental_payment', [oneAndAHalf.daysAgo, now]) // this is due to some lag on splinterlands api where an active_rental that expired doesn't get expired from the api immediately
            .catch((err) => {
                // otherwise would only need a day back
                logger.error(
                    `/services/userRentals/getRecentDBRentals UserRentals query with users_id: ${users_id}, now: ${now} and oneDayAgo: ${oneDayAgo} error: ${err.message}`
                );
                throw err;
            });

        logger.info(`/services/userRentals/getRecentDBRentals:`);
        return dbActiveRentals;
    } catch (err) {
        logger.error(
            `/services/userRentals/getRecentDBRentals error: ${err.message}`
        );
        throw err;
    }
};

// converts an array of active_rentals into an object that you can search for a rental by the card_uid of the card rented out
const sortDBRentalsByUid = ({ rentals }) => {
    try {
        logger.debug(`/services/userRentals/sortDBRentalsByUid start`);
        // only thing we use from rentalsObj is the key to search, and then the rental_tx and sell_trx_id of that rental
        const rentalsObj = {};
        if (!Array.isArray(rentals) || rentals?.length === 0) {
            return rentalsObj;
        }

        for (const rental of rentals) {
            const { card_uid, sell_trx_id, rental_tx, next_rental_payment } =
                rental;
            const next_rental_payment_time = new Date(
                next_rental_payment
            ).getTime();

            const rentalKey = `${card_uid}${next_rental_payment_time}`; // we shouldn't have any duplicates of this imo.
            const rentalToInsert = {
                card_uid,
                sell_trx_id,
                rental_tx,
                next_rental_payment_time,
            };
            rentalsObj[rentalKey] = rentalToInsert;
        }

        logger.info(
            `/services/userRentals/sortDBRentalsByUid: rentals: ${
                rentals?.length
            }, rentalsObj: ${Object.keys(rentalsObj).length}`
        );

        return rentalsObj;
    } catch (err) {
        logger.error(
            `/services/userRentals/sortDBRentalsByUid error: ${err.message}`
        );
        throw err;
    }
};

const filterIfInDB = ({
    transformedAPIRentals,
    dbRentalsByUid,
    users_id,
    cardDetailsObj,
}) => {
    try {
        logger.debug(`/services/userRentals/filterIfInDB`);

        const rentalsToInsert = [];
        const rentalsAlreadyInserted = [];

        for (const rental of transformedAPIRentals) {
            // rental.card_id = card.uid from collection API, both saved to card_uid column
            const card_uid = rental.card_id;
            const next_rental_payment = new Date(rental.next_rental_payment);
            const { oneDayAgo } = utilDates.getOneDayAgo({
                date: next_rental_payment,
            });
            const last_rental_payment = oneDayAgo;
            let sell_trx_hive_id = '';
            const splits = rental.sell_trx_id.split('-');
            if (Array.isArray(splits) && splits.length > 1) {
                sell_trx_hive_id = splits[0];
            }

            const card_details = cardDetailsObj[rental.card_detail_id];
            const level = findCardLevel({
                id: rental.card_detail_id,
                rarity: card_details.rarity,
                _xp: rental.xp,
                gold: rental.gold,
                edition: card_details.edition,
                tier: rental.tier,
                alpha_xp: 0,
            });

            const next_rental_payment_time = new Date(
                next_rental_payment
            ).getTime();

            const rentalKey = `${card_uid}${next_rental_payment_time}`;
            const matchedRental = dbRentalsByUid[rentalKey];
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
                sell_trx_hive_id,
            };
            if (matchedRental != null) {
                logger.debug('matchedRental is not null');
                // there was a match
                if (
                    matchedRental.rental_tx === rental.rental_tx &&
                    matchedRental.sell_trx_id === rental.sell_trx_id
                ) {
                    // this means that the rental already exists in the DB
                    rentalsAlreadyInserted.push(rentalKey);
                } else {
                    // this happens when there is a uid match but the rental_tx and/or sell_trx are different
                    logger.warn(
                        `we have a matched rental from rentalKey: ${rentalKey}`
                    );
                    rentalsToInsert.push(rentalToAdd);
                }
            } else {
                // there is no match, we need to insert this into the db
                rentalsToInsert.push(rentalToAdd);
            }
        }

        logger.info(
            `/services/userRentals/filterIfInDB: Already Inserted: ${rentalsAlreadyInserted?.length}, To Insert: ${rentalsToInsert?.length}`
        );
        return {
            rentalsToInsert,
            rentalsAlreadyInserted,
        };
    } catch (err) {
        logger.error(
            `/services/userRentals/filterIfInDB error: ${err.message}`
        );
        throw err;
    }
};

const insertActiveRentals = async ({ rentals }) => {
    try {
        logger.debug(`/services/userRentals/insertActiveRentals`);
        if (!Array.isArray(rentals) || rentals?.length === 0 || !rentals) {
            logger.info(
                `/services/userRentals/insertActiveRentals no rentals: ${JSON.stringify(
                    rentals
                )}`
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
                        `/services/userRentals/insertActiveRentals UserRentals insert with rentalChunk: ${JSON.stringify(
                            rentalChunk
                        )}, rentals: ${JSON.stringify(rentals)},
                        error: ${err.message}`
                    );
                    throw err;
                });
        }
        logger.info(`/services/userRentals/insertActiveRentals:`);
        return;
    } catch (err) {
        logger.error(
            `/services/userRentals/insertActiveRentals error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    update,
};
