'use strict';
const logger = require('../util/pinologger');
const _ = require('lodash');
const Users = require('../models/Users');
const UserRentals = require('../models/UserRentals');
const retryFncs = require('../util/axios_retry/general');
const cardDetails = require('../util/cardDetails.json');
const rentals = require('./rentals');
const utilDates = require('../util/dates');
const splinterlandsService = require('./splinterlands');
const { NotNullViolationError } = require('objection');
const HiveTxDate = require('../models/HiveTxDate');
const knexInstance = require('../../db/index');
const { updateHiveTxDates } = require('./hive/dates');
const confirmRentalsForUsers = async () => {
    try {
        logger.debug(`/services/rentalConfirmation/confirmRentalsForUsers`);
        const cardDetailsObj = {};
        cardDetails.forEach((card) => {
            cardDetailsObj[card.id] = card;
        });
        const users = await Users.query();
        let count = 0;
        const fiveMinutesInMS = 1000 * 60 * 5;
        for (const user of users) {
            // await rentals
            //     .updateRentalsInDb({
            //         username: user.username,
            //         users_id: user.id,
            //         cardDetailsObj,
            //     })
            //     .catch((err) => {
            //         logger.error(
            //             `/services/rentalConfirmation/confirmRentalsForUsers .updateRentalsInDb users_id: ${JSON.stringify(
            //                 user.id
            //             )} error: ${err.message}`
            //         );
            //         throw err;
            //     });
            await patchRentalsBySplintersuite({
                users_id: user.id,
                username: user.username,
            });
            // await rentals
            //     .patchRentalsBySplintersuite({
            //         users_id: user.id,
            //         username: user.username,
            //     })
            //     .catch((err) => {
            //         logger.error(
            //             `/services/rentalConfirmation/confirmRentalsForUsers .patchRentalsBySplintersuite users_id: ${JSON.stringify(
            //                 user.id
            //             )} error: ${err.message}`
            //         );
            //         throw err;
            //     });
            if (count !== 0 && count % 100 === 0) {
                await retryFncs.sleep(fiveMinutesInMS);
            }
            await retryFncs.sleep(1000);
            count++;
        }
        logger.info(
            `/services/rentalConfirmation/confirmRentalsForUsers: for ${users?.length} users`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/confirmRentalsForUsers error: ${err.message}`
        );
        throw err;
    }
};

const patchRentalsBySplintersuite = async ({ users_id, username }) => {
    try {
        logger.info(
            `/services/rentalConfirmation/patchRentalsBySplintersuite start`
        );

        // TNT NOTE: these are tests
        //
        //
        //
        /*
        const uniqueRentalTxs = await UserRentals.query()
            .select('sell_trx_hive_id')
            .distinctOn('sell_trx_hive_id');

        const distinctNotNullRentalTxs = await UserRentals.query()
            .whereNotNull('confirmed')
            .distinctOn('sell_trx_hive_id');

        const distinctNullRentalTxs = await UserRentals.query()
            .whereNull('confirmed')
            .distinctOn('sell_trx_hive_id');

        const sellTrxIds = distinctNotNullRentalTxs.map(
            ({ sell_trx_hive_id }) => sell_trx_hive_id
        );
        logger.info(`uniqueRentalTxs: ${uniqueRentalTxs?.length}`);

        logger.info(
            `distinctNotNullRentalTxs: ${distinctNotNullRentalTxs?.length}`
        );
        logger.info(`distinctNullRentalTxs: ${distinctNullRentalTxs?.length}`);

        const testSql = `SELECT distinct on (sell_trx_hive_id) ur.* FROM user_rentals ur WHERE NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`; // in (?) or in ()

        const uniqueRentalsConfirmed = await UserRentals.query()
            .where({
                users_id,
            })
            .whereNotNull('confirmed')
            .distinctOn('sell_trx_hive_id');

        logger.info(
            `uniqueRentalsConfirmed: ${uniqueRentalsConfirmed?.length}`
        );
        const testSql_ids = await knexInstance.raw(testSql, [sellTrxIds]);
            
        logger.info(`testSql_ids: ${testSql_ids?.rows?.length}`);
        const latestConfirmedSql = `SELECT distinct on (sell_trx_hive_id) ur.* FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        const latestConfirmedBySellId = await knexInstance.raw(
            latestConfirmedSql
        );

          logger.info(
            `latestConfirmedBySellId: ${latestConfirmedBySellId?.rows?.length}`
        );

        if (
            !Array.isArray(latestConfirmedBySellId.rows) ||
            latestConfirmedBySellId.rows?.length === 0
        ) {
            logger.info(
                `/services/rentalConfirmationpatchRentalsBySplintersuite no sell_trx_hive_ids for user: ${username}`
            );
            return null;
        }
        */
        // end of tests
        //
        //
        //
        //

        const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        const latestConfirmedBySellIdForUser = await knexInstance.raw(
            latestConfirmedByUserSql,
            users_id
        );
        if (
            !Array.isArray(latestConfirmedBySellIdForUser.rows) ||
            latestConfirmedBySellIdForUser.rows?.length === 0
        ) {
            logger.info(
                `/services/rentalConfirmationpatchRentalsBySplintersuite latestConfirmedBySellIdForUser no sell_trx_hive_ids for user: ${username}`
            );

            const anyRentalsToConfirm = await UserRentals.query()
                .where({ users_id })
                .distinctOn('sell_trx_hive_id');

            if (anyRentalsToConfirm?.length > 0) {
                // TNT TODO: 1) query the hive_tx_date for the created_at, and then take the min of it and use it for everything
                // ALSO TNT TODO: imo we should get all of this logic into a new function, so that we ultimately just return the date at the end imo
            } else {
                return null;
            }
        } else {
            const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur WHERE users_id = ? AND NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
            // const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.* FROM user_rentals ur WHERE NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
            logger.info(
                `latestConfirmedBySellIdForUser: ${latestConfirmedBySellIdForUser?.rows?.length}`
            );
            const confirmedSellTrxIds = latestConfirmedBySellIdForUser.rows.map(
                ({ sell_trx_hive_id }) => sell_trx_hive_id
            );
            const neverConfirmedSellTxs = await knexInstance.raw(
                neverConfirmedSellTxsSql,
                [users_id, confirmedSellTrxIds]
            );
            logger.info(
                `neverConfirmedSellTxs.rows: ${JSON.stringify(
                    neverConfirmedSellTxs.rows
                )} neverConfirmedSellTxs.length: ${
                    neverConfirmedSellTxs?.rows?.length
                }`
            );
            logger.info(`username: ${username}`);
            logger.info(`confirmedSellTrxIds: ${confirmedSellTrxIds}`);
            // TNT TODO: we need to test if our neverConfirmedSellTxsSql is actually working, which we will do with cehcking UserRentals
            const distinctNullRentalTxs = await UserRentals.query()
                .select('sell_trx_hive_id')
                .where({ users_id })
                .whereNull('confirmed')
                .distinctOn('sell_trx_hive_id');

            logger.info(
                `distinctNullRentalTxs: ${distinctNullRentalTxs?.length}`
            );
            const notConfirmedSellTxs = distinctNullRentalTxs.map(
                ({ sell_trx_hive_id }) => sell_trx_hive_id
            );

            const matchingTxs = notConfirmedSellTxs.map((sell_id) =>
                confirmedSellTrxIds.includes(sell_id) ? sell_id : null
            );
            logger.info(
                `matchingTxs: ${matchingTxs}, matchingTxs.length: ${matchingTxs?.length}`
            );
            logger.info(`notConfirmedSellTxs: ${notConfirmedSellTxs}`);

            logger.info(
                `Object.prototype.toString.call(latestConfirmedBySellIdForUser?.rows[0].last_rental_payment) === "[object Date]": ${
                    Object.prototype.toString.call(
                        latestConfirmedBySellIdForUser?.rows[0]
                            .last_rental_payment
                    ) === '[object Date]'
                }, latestConfirmedBySellIdForUser?.rows[0].last_rental_payment: ${
                    latestConfirmedBySellIdForUser?.rows[0].last_rental_payment
                }, latestConfirmedBySellIdForUser?.rows[0].last_rental_payment.getTime(): ${latestConfirmedBySellIdForUser?.rows[0].last_rental_payment.getTime()}`
            );
            const confirmedRentalTimes =
                latestConfirmedBySellIdForUser?.rows.map(
                    ({ last_rental_payment }) => last_rental_payment.getTime()
                );

            const minConfirmedRentalTime = _.min(confirmedRentalTimes);
            logger.info(`minConfirmedRentalTime: ${minConfirmedRentalTime}`);

            if (neverConfirmedSellTxs?.length > 0) {
                const neverConfirmedCreatedDates = await HiveTxDate.query()
                    .select('hive_created_at')
                    .whereIn('hive_tx_id', neverConfirmedSellTxs.rows);

                logger.info(
                    `neverConfirmedCreatedDates: ${neverConfirmedCreatedDates}`
                );
                const createdTimes = neverConfirmedCreatedDates.map(
                    ({ hive_created_at }) => hive_created_at?.getTime()
                );
                if (createdTimes) {
                    const minCreatedDate = _.min(createdTimes);
                    logger.info(
                        `minCreatedDate: ${minCreatedDate}, createdTimes: ${createdTimes}`
                    );
                } else {
                    logger.info(`createdTimes: ${createdTimes}`);
                }
            } else {
                return minConfirmedRentalTime;
            }

            // if matchingTxs.length === distinctNullRentalTxs, we have no extra non ids, aka everything is good.  If there is discrepancy, we're in trouble

            // things we need to do:
            // 1) get the earliest date that we need to go through confirmation process.
            // 1a) get the earliest of the confirmedDates that we already have in our sql query
            // 1b) get the rental sell_trx_ids that have NEVER BEEN CONFIRMED (testSql actually does that, but we could also just query the hive_tx_date table as well to find em, although we'd need a join anyway since they don't have a users_id on that)
            // 1c) search in hive_tx_dates for the sell_trx_ids, and get back the created_at dates
            // 1d) get the farthest back out of all of them (_.min)

            // 2) optimize the whole process of searching in a db via indexes (imo) https://dba.stackexchange.com/questions/33196/multicolumn-index-and-performance/33220#33220
            // logger.info(
            //     `latestConfirmedBySellIdForUser.rows: ${JSON.stringify(
            //         latestConfirmedBySellIdForUser.rows
            //     )}`
            // );
            throw new Error('checking');
            // TNT TODO: WE NEED TO GET IT SO THAT we have an object where you can search by sell_trx_id, and it has the most recent date that a sell_trx_id has been confirmed on it.
            // In order to do this, we need to get the userRentals with the most recent sell_trx_id, and also get the hive_tx_date and checkout its most recent confirmed, and see which one has the most recent date on it.  It should never be more back than the hive_tx_date, if it is we have an issue
            // if (username === 'xdww' || username === 'tamecards') {
            //     logger.info(
            //         `rentalsToConfirm.length: ${rentalsToConfirm.length}, rentalsConfirmed.length: ${rentalsConfirmed.length}`
            //     );
            //     throw new Error(
            //         'checking the number of null for both to make sure its correct'
            //     );
            // }
            // return;
            // we get all of the ones we need to confirm,
            // we then need to sort them all by the most recent date, and then we can get the earliest of all of these and go back and find
            // the earliest date that we should use.
            // TNT NOTE: we also need to make sure that all the sellTrxIds in our rentalsToConfirm === the nmumber of sell_trx_ids that we have in the db, otherwise we need to go back to when it was created
            // IF THERE ARENT ANY, then we need to add the created_at of the sellTrxId transactions that aren't included, and include that in what we ultimately find for the last shit

            // TNT TODO:

            // const earliestMarketId = getEarliestDateNeeded({
            //     rentalsConfirmed,
            //     sellTrxIds,
            // });

            /*
        TODO:
        we need to check if there are rows of recent confirmed rentals, if there are not, then we need to go through and do the old way of going back to the beginnning of the earleist createdDate
        */
            if (recentConfirmedRentals) {
                // if they have any, then xd
            } else {
                // if not, then we need to do old way
            }

            // TNT NOTE:
            // WE want to be able to only need to look far back enough, we want to essentially be able to
            // only go back to the sell_trx_ids that we DONT have one confirmed for
            return;
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/patchRentalsBySplintersuite error: ${err.message}`
        );
        throw err;
    }
};

const calcDateWithConfirmed = ({
    confirmedRentalTimes,
    neverConfirmedSellTxs, // TNT USE this to query our db and get the created_ats!
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/calcDateWithConfirmed`);

        for (const confirmedRental of confirmedRentalSellTxs) {
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/calcDateWithConfirmed error: ${err.message}`
        );
        throw err;
    }
};

const getEarliestDateNeeded = async ({
    confirmedSellTxs,
    neverConfirmedSellTxs,
    users_id,
    username,
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/getEarliestDateNeeded`);
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getEarliestDateNeeded error: ${err.message}`
        );
        throw err;
    }
};

const getSellTxsByConfirmedAndNot = async ({ users_id, username }) => {
    try {
        logger.debug(
            `/services/rentalConfirmation/getSellTxsByConfirmedAndNot`
        );
        const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        const latestConfirmedByRentalIdForUser = await knexInstance.raw(
            latestConfirmedByUserSql,
            users_id
        );
        if (
            !Array.isArray(latestConfirmedByRentalIdForUser.rows) ||
            latestConfirmedByRentalIdForUser.rows?.length === 0
        ) {
            logger.warn(
                `/services/rentalConfirmation/getSellTxsByConfirmedAndNot no confirmed sell_trx_hive_ids for username ${username} `
            );
            // TNT NOTE: can do this or query the hive_tx_date table, which is def must faster so should do this imo
            const rentalsNotConfirmed = await UserRentals.query()
                //    .select('sell_trx_hive_id')
                .where({ users_id })
                .distinctOn('sell_trx_hive_id');
            const neverConfirmedTxs = rentalsNotConfirmed.map(
                ({ last_rental_payment, sell_trx_hive_id }) => {
                    last_rental_payment, sell_trx_hive_id;
                }
            );
            logger.info(
                `/services/rentalConfirmation/getSellTxsByConfirmedAndNot: username: ${username} confirmedSellTxs:${0}, neverConfirmedTxs: ${
                    neverConfirmedTxs?.length
                }`
            );
            return { neverConfirmedTxs, confirmedTxs: [] };
            // // TNT: this should go in another function about calculate earliestDate
            // if (rentalsNotConfirmed?.length > 0) {
            //     const neverConfirmedCreatedDates = await HiveTxDate.query()
            //         .select('hive_created_at')
            //         .whereIn('hive_tx_id', rentalsNotConfirmed);
        } else {
            // we have at least one confirmed user rental for the user
            const neverConfirmedRentalTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur WHERE users_id = ? AND NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
            logger.info(
                `latestConfirmedByRentalIdForUser: ${latestConfirmedByRentalIdForUser?.rows?.length}`
            );
            const confirmedRentalTrxIds =
                latestConfirmedByRentalIdForUser.rows.map(
                    ({ sell_trx_hive_id }) => sell_trx_hive_id
                );

            const neverConfirmedRentalTxs = await knexInstance.raw(
                neverConfirmedRentalTxsSql,
                [users_id, confirmedRentalTrxIds]
            );
            logger.info(
                `neverConfirmedRentalTxs.rows: ${JSON.stringify(
                    neverConfirmedRentalTxs.rows
                )} neverConfirmedRentalTxs.length: ${
                    neverConfirmedRentalTxs?.rows?.length
                }`
            );

            logger.info(
                `/services/rentalConfirmation/getSellTxsByConfirmedAndNot: username: ${username}, neverConfirmedTxs: ${neverConfirmedRentalTxs?.rows.length}, confirmedTxs:${confirmedRentalTrxIds?.rows?.length}`
            );

            return {
                neverConfirmedTxs: neverConfirmedRentalTxs?.rows,
                confirmedTxs,
            };
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getSellTxsByConfirmedAndNot error: ${err.message}`
        );
        throw err;
    }
};

// goal of this function is to get any IDs that have never been confirmed, because we need to get their created_at date rather than the last_payment_date (since last_payment_date is confirmed)
const getNewIdsToConfirm = ({ rentalsConfirmed, rentalsToConfirm }) => {
    try {
        logger.debug(`/services/rentalConfirmation/getNewIdsToConfirm`);

        // const sellTrxIdsToConfirm = _.uniq(
        //     rentalsToConfirm.map(({ sell_trx_id }) => sell_trx_id)
        // );

        const sellTrxIdsConfirmed = _.uniq(
            rentalsConfirmed.map(({ sell_trx_id }) => sell_trx_id)
        );

        // we need to loop over all the rentalsToConfirm, and see if they result in any matches in sellTrxIdsConfirmed, if they don't then we need to add the created_at datetime to list of potential dates
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getNewIdsToConfirm error: ${err.message}`
        );
        throw err;
    }
};

const getEarliestRentalCreatedDate = ({ rentals }) => {
    try {
        logger.debug(
            `/services/rentalConfirmation/getEarliestRentalCreatedDate`
        );

        // const allCreatedDateTimes = [];

        // for (const rental of rentals) {
        //     const { created_at } = rental;
        //     const created_at_time = new Date(created_at).getTime();
        //     allCreatedDates.push(created_at_time);
        // }

        // const earliestDateTime = _.min(allCreatedDateTimes);

        logger.info(
            `/services/rentalConfirmation/getEarliestRentalCreatedDate: ${earliestDateTime}, rentals: ${rentals?.length}`
        );
        return earliestDateTime;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getEarliestRentalCreatedDate error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    confirmRentalsForUsers,
    patchRentalsBySplintersuite,
};
