'use strict';
const _ = require('lodash');
const UserRentals = require('../models/UserRentals');
const logger = require('../util/pinologger');
const splinterlandsService = require('./splinterlands');
const hiveService = require('./hive/relistings');
const utilDates = require('../util/dates');
const findCardLevel = require('../util/calculateCardLevel');

const updateRentalsInDb = async ({ username, users_id, cardDetailsObj }) => {
    try {
        logger.info(
            `/services/rentals/allAccountUpdate/updateRentalsInDB start for ${username}`
        );

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

        const dbRentalsByUid = searchableDBRentals({
            rentals: dbActiveRentals,
        });
        logger.info(
            `dbActiveRentals: ${JSON.stringify(
                dbActiveRentals.length
            )}, dbRentalsByUid: ${JSON.stringify(
                Object.keys(dbRentalsByUid).length
            )}`
        );

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
            `/services/rentals/allAccountUpdate/updateRentalsInDB User: ${username}`
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

        if (rentals?.length === 0 || !rentals) {
            logger.info(
                `/services/rentals/allAccountUpdate/insertActiveRentals no rentals, rentals: ${JSON.stringify(
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
                        `/services/rentals/allAccountUpdate/insertActiveRentals UserRentals table insert fail on rentals: ${JSON.stringify(
                            rentals
                        )}, rentalChunk: ${JSON.stringify(
                            rentalChunk
                        )} error: ${err.message}`
                    );
                    throw err;
                });
        }

        logger.info(`/services/rentals/allAccountUpdate/insertActiveRentals`);
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
        logger.info(`/services/rentals/allAccountUpdate/getActiveRentalsInDB`);
        return dbActiveRentals;
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/getActiveRentalsInDB error: ${err.message}`
        );
        throw err;
    }
};

// converts an array of active_rentals into an object that you can search for a rental by the card_uid of the card rented out
const searchableDBRentals = ({ rentals }) => {
    try {
        logger.debug('/services/rentals/allAccountUpdate/searchableDBRentals');
        // const createdAt = DateTime.fromJSDate(created_at);
        // const startOfDay = utilDates.getStartOfDay({ date: createdAt });
        const rentalsObj = {};
        if (rentals.length === 0) {
            return rentalsObj;
        }
        rentals.forEach((rental) => {
            // TNT MAYBE: we should maybe have this only have the startOfDay so its less info to ultimately query?
            const { card_uid, sell_trx_id, next_rental_payment } = rental;
            const next_rental_payment_time = new Date(
                next_rental_payment
            ).getTime();
            const rentalKey = `${card_uid}${next_rental_payment_time}`; // we shouldn't have any duplicates of this imo.
            rentalsObj[rentalKey] = rental;
        });

        logger.info('/services/rentals/allAccountUpdate/searchableDBRentals');
        return rentalsObj;
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/searchableDBRentals error: ${err.message}`
        );
        throw err;
    }
};

const cleanAPIActiveRentals = ({ activeRentals }) => {
    try {
        logger.debug(
            '/services/rentals/allAccountUpdate/cleanAPIActiveRentals'
        );

        const cleanedActiveRentals = [];
        activeRentals.forEach((rental) => {
            const { oneDayAgo, oneDayAgoInMS } = utilDates.getOneDayAgo({
                date: rental.next_rental_payment,
            });

            rental.buy_price = parseFloat(rental.buy_price);
            rental.last_rental_payment = oneDayAgo;
            cleanedActiveRentals.push(rental);
        });

        logger.info(
            `/services/rentals/allAccountUpdate/cleanAPIActiveRentals activeRentals: ${JSON.stringify(
                activeRentals.length
            )}, cleanedActiveRentals ${JSON.stringify(
                cleanedActiveRentals.length
            )}`
        );

        return cleanedActiveRentals;
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
            let sell_trx_hive_id = '';
            const splits = rental.sell_trx_id.split('-');
            if (Array.isArray(splits) && splits.length > 1) {
                sell_trx_hive_id = splits[0];
            }
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
                sell_trx_hive_id,
            };

            const next_rental_payment_time = new Date(
                next_rental_payment
            ).getTime();
            const rentalKey = `${card_uid}${next_rental_payment_time}`;
            const matchedRental = dbRentalsByUid[rentalKey];

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

                    logger.debug(
                        `rentalKey matched, so next_rental_payment is equal, and rental_tx and sell_trx are same with matchedRental`
                    );
                    rentalsAlreadyInserted.push(rentalToAdd);
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
        logger.info(
            `/services/rentals/allAccountUpdate/filterIfInDB Already Inserted: ${rentalsAlreadyInserted?.length}, To Insert: ${rentalsToInsert?.length}`
        );
        return {
            rentalsToInsert,
            rentalsAlreadyInserted,
        };
    } catch (err) {
        logger.error(
            `/services/rentals/allAccountUpdate/filterIfInDB error: ${err.message}`
        );
        throw err;
    }
};

const patchRentalsWithRelistings = async ({ users_id, recentHiveIDs }) => {
    try {
        logger.info(`/services/rentals/patchRentalsWithRelistings start`);
        // patch... dates are ascending... so we may overwrite a few times but it will be accurate...
        // and fortunately fewer db calls
        for (const record of recentHiveIDs) {
            // logger.info(
            //     `/services/rentals/patchRentalsWithRelistings record: ${JSON.stringify(
            //         record
            //     )}`
            // );
            if (record?.isPriceUpdate) {
                const res = await UserRentals.query()
                    .where({ users_id })
                    .where('last_rental_payment', '>=', record.time)
                    .whereIn('sell_trx_id', record.IDs)
                    .patch({ confirmed: record.isSplintersuite });
                //    logger.info(`res is: ${res}`);
            } else {
                const res = await UserRentals.query()
                    .where({ users_id })
                    .where('last_rental_payment', '>=', record.time)
                    .whereIn('card_uid', record.IDs)
                    .patch({ confirmed: record.isSplintersuite });
                //      logger.info(`res is: ${res}`);
            }
        }
        logger.info(
            `/services/rentals/patchRentalsWithRelistings: user: ${users_id}`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/rentals/patchRentalsWithRelistings error: ${err.message}`
        );
        throw err;
    }
};

const patchRentalsBySplintersuite = async ({ users_id, username }) => {
    try {
        logger.info(`/services/rentals/patchRentalsBySplintersuite start`);
        const rentalsToConfirm = await UserRentals.query().where({
            users_id,
            confirmed: null,
        });
        if (!Array.isArray(rentalsToConfirm) || rentalsToConfirm?.length < 1) {
            logger.warn(
                `for user: ${username}, don't have any saved userRentals whose confirmed is null`
            );
            return;
        }

        const marketIdsForCollection =
            await splinterlandsService.marketIdsForCollection({
                username,
            });

        const sellTransactionIds = _.uniq(
            rentalsToConfirm.map(({ sell_trx_id }) => sell_trx_id)
        );

        const earliestTime = earliestMarketId({
            marketIdsForCollection,
            sellTransactionIds,
        });
        const msInADay = 1000 * 60 * 60 * 24;
        const fortyFiveDaysTime = 45 * msInADay;
        const nowTime = new Date().getTime();

        const fortyFiveDaysAgo = nowTime - fortyFiveDaysTime;

        // larger number means it was more recent, we want to go as far back as neccessary
        const timeToStopAt =
            earliestTime < fortyFiveDaysAgo ? earliestTime : fortyFiveDaysAgo;
        // now we can use the map to find out the created_at, and then find the earliest created_at and use it in the lastUncomfirmedRentalTime
        throw new Error(
            `checking for timeToStopAt in /services/rentals/patchRentalsBySplintersuite username: ${username}`
        );
        const recentHiveIDs = await hiveService.getTransactionHiveIDsByUser({
            username,
            timeToStopAt,
        });
        // logger.info(`recentHiveIDs[0]: ${JSON.stringify(recentHiveIDs[0])}`);
        // throw new Error('checking to see if we are blocking old txs now');
        await patchRentalsWithRelistings({
            users_id,
            recentHiveIDs,
        });
        // TNT IDEAs: 1) we have the earliest date we go back be the beginning of the null market_ids created and go from there,
        // 2) we could instead just say go back the past 2 months at most and ignore everything else/say fuck it.
        // 3) once we have shit deleting after a month and we consolidate that, we should be good to go then

        /*  const hiveTransactionIds = _.uniq(
            rentalsToConfirm.map(({ sell_trx_hive_id }) => sell_trx_hive_id)
        );
        logger.info(
            `/services/rentals/patchRentalsBySplintersuite hiveTransactionIds: ${hiveTransactionIds?.length}`
        );
        const splintersuiteRentalIds = [];
        const userRentalIds = [];

        // figure out if we made the transaction
        for (const hiveTransactionId of hiveTransactionIds) {
            const transaction = await hiveService.getHiveTransaction({
                transactionId: hiveTransactionId,
            });
            if (transaction?.agent === 'splintersuite') {
                splintersuiteRentalIds.push(hiveTransactionId);
            } else {
                userRentalIds.push(hiveTransactionId);
            }
        }
        logger.info(
            `/services/rentals/patchRentalsBySplintersuite hiveTransactionIds: ${hiveTransactionIds?.length}, splintersuite Rental Ids: ${splintersuiteRentalIds?.length}, userRentalIds: ${userRentalIds?.length}, rentalsToConfirm: ${rentalsToConfirm?.length}`
        );
        logger.info(
            `/services/rentals/patchRentalsBySplintersuite hiveTransactionIds: ${JSON.stringify(
                hiveTransactionIds
            )}, splintersuiteRentalIds: ${JSON.stringify(
                splintersuiteRentalIds
            )}, userRentalIds: ${JSON.stringify(userRentalIds)} `
        );
        // update the database
        let chunks = splintersuiteRentalIds;

        if (splintersuiteRentalIds.length > 998) {
            chunks = _.chunk(splintersuiteRentalIds, 998);
        }

        if (chunks.length === splintersuiteRentalIds.length) {
            chunks = [chunks];
        }

        for (const idChunk of chunks) {
            await UserRentals.query()
                .where({ users_id })
                .whereIn('sell_trx_hive_id', idChunk)
                .patch({ confirmed: true });
        }

        chunks = userRentalIds;

        if (userRentalIds.length > 998) {
            chunks = _.chunk(userRentalIds, 998);
        }

        if (chunks.length === userRentalIds.length) {
            chunks = [chunks];
        }

        for (const idChunk of chunks) {
            await UserRentals.query()
                .where({ users_id })
                .whereIn('sell_trx_hive_id', idChunk)
                .patch({ confirmed: false });
        }*/
        logger.info(
            `/services/rentals/patchRentalsBySplintersuite: ${users_id}, rentalsToConfirm: ${rentalsToConfirm?.length}, recentHiveIDs: ${recentHiveIDs?.length}`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/rentals/patchRentalsBySplintersuite error: ${err.message}`
        );
        throw err;
    }
};

const earliestMarketId = ({ marketIdsForCollection, sellTransactionIds }) => {
    try {
        logger.debug(`/services/rentals/earliestMarketId start`);
        const txDates = [];
        let noTxFound = 0;
        for (const sellTxId of sellTransactionIds) {
            const sellTxInfo = marketIdsForCollection[sellTxId];
            if (sellTxInfo) {
                const txDate = new Date(
                    sellTxInfo?.market_created_date
                ).getTime();
                txDates.push(txDate);
            } else {
                noTxFound = noTxFound + 1;
            }
        }
        const minDateTime = _.min(txDates);
        const minDate = new Date(minDateTime);
        logger.info(`/services/rentals/earliestMarketId:`);
        logger.info(
            `txDates: ${txDates?.length}, noTxFound: ${noTxFound}, minDateTime: ${minDateTime}, minDate: ${minDate}`
        );

        return minDateTime;
    } catch (err) {
        logger.error(
            `/services/rentals/earliestMarketId error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    updateRentalsInDb,
    patchRentalsBySplintersuite,
    cleanAPIActiveRentals,
    searchableDBRentals,
    filterIfInDB,
    insertActiveRentals,
};

/*
curl -s --data '{"jsonrpc":"2.0", "method":"account_history_api.get_account_history", "params":{"account":"xdww", "start":-1, "limit":10, "operation_filter_low": 262144}, "id":1}' https://api.hive.blog/
*/
