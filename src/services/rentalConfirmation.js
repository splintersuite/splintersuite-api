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
const hiveService = require('./hive/relistings');
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
        const anyRentalsToConfirmArr = await UserRentals.query()
            .select('sell_trx_hive_id')
            .where({ users_id })
            .whereNull('confirmed')
            .distinctOn('sell_trx_hive_id');

        if (
            !anyRentalsToConfirmArr ||
            !Array.isArray(anyRentalsToConfirmArr) ||
            anyRentalsToConfirmArr.length < 1
        ) {
            logger.info(
                `${username} does not have any new User Rentals to confirm`
            );
            return;
        }

        const anyRentalsToConfirm = anyRentalsToConfirmArr.map(
            ({ sell_trx_hive_id }) => sell_trx_hive_id
        );

        const earliestTime = await getEarliestTimeNeeded({
            users_id,
            username,
            anyRentalsToConfirm,
        });
        throw new Error(
            `checking for earliestTime in /services/rentalConfirmation/patchRentalsBySplintersuite username: ${username}`
        );
        const recentHiveIDs = await hiveService.getTransactionHiveIDsByUser({
            username,
            timeToStopAt: earliestTime,
        });

        await patchRentalsWithRelistings({
            users_id,
            recentHiveIds,
        });
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

        // const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        // const latestConfirmedBySellIdForUser = await knexInstance.raw(
        //     latestConfirmedByUserSql,
        //     users_id
        // );
        // if (
        //     !Array.isArray(latestConfirmedBySellIdForUser.rows) ||
        //     latestConfirmedBySellIdForUser.rows?.length === 0
        // ) {
        //     logger.info(
        //         `/services/rentalConfirmationpatchRentalsBySplintersuite latestConfirmedBySellIdForUser no sell_trx_hive_ids for user: ${username}`
        //     );

        //     if (anyRentalsToConfirm?.length > 0) {
        //         // TNT TODO: 1) query the hive_tx_date for the created_at, and then take the min of it and use it for everything
        //         // ALSO TNT TODO: imo we should get all of this logic into a new function, so that we ultimately just return the date at the end imo
        //     } else {
        //         return null;
        //     }
        // } else {
        //     const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur WHERE users_id = ? AND NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
        //     // const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.* FROM user_rentals ur WHERE NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
        //     logger.info(
        //         `latestConfirmedBySellIdForUser: ${latestConfirmedBySellIdForUser?.rows?.length}`
        //     );
        //     const confirmedSellTrxIds = latestConfirmedBySellIdForUser.rows.map(
        //         ({ sell_trx_hive_id }) => sell_trx_hive_id
        //     );
        //     const neverConfirmedSellTxs = await knexInstance.raw(
        //         neverConfirmedSellTxsSql,
        //         [users_id, confirmedSellTrxIds]
        //     );
        //     logger.info(
        //         `neverConfirmedSellTxs.rows: ${JSON.stringify(
        //             neverConfirmedSellTxs.rows
        //         )} neverConfirmedSellTxs.length: ${
        //             neverConfirmedSellTxs?.rows?.length
        //         }`
        //     );
        //     logger.info(`username: ${username}`);
        //     logger.info(`confirmedSellTrxIds: ${confirmedSellTrxIds}`);
        //     // TNT TODO: we need to test if our neverConfirmedSellTxsSql is actually working, which we will do with cehcking UserRentals
        //     const distinctNullRentalTxs = await UserRentals.query()
        //         .select('sell_trx_hive_id')
        //         .where({ users_id })
        //         .whereNull('confirmed')
        //         .distinctOn('sell_trx_hive_id');

        //     logger.info(
        //         `distinctNullRentalTxs: ${distinctNullRentalTxs?.length}`
        //     );
        //     const notConfirmedSellTxs = distinctNullRentalTxs.map(
        //         ({ sell_trx_hive_id }) => sell_trx_hive_id
        //     );

        //     const matchingTxs = notConfirmedSellTxs.map((sell_id) =>
        //         confirmedSellTrxIds.includes(sell_id) ? sell_id : null
        //     );
        //     logger.info(
        //         `matchingTxs: ${matchingTxs}, matchingTxs.length: ${matchingTxs?.length}`
        //     );
        //     logger.info(`notConfirmedSellTxs: ${notConfirmedSellTxs}`);

        //     logger.info(
        //         `Object.prototype.toString.call(latestConfirmedBySellIdForUser?.rows[0].last_rental_payment) === "[object Date]": ${
        //             Object.prototype.toString.call(
        //                 latestConfirmedBySellIdForUser?.rows[0]
        //                     .last_rental_payment
        //             ) === '[object Date]'
        //         }, latestConfirmedBySellIdForUser?.rows[0].last_rental_payment: ${
        //             latestConfirmedBySellIdForUser?.rows[0].last_rental_payment
        //         }, latestConfirmedBySellIdForUser?.rows[0].last_rental_payment.getTime(): ${latestConfirmedBySellIdForUser?.rows[0].last_rental_payment.getTime()}`
        //     );
        //     const confirmedRentalTimes =
        //         latestConfirmedBySellIdForUser?.rows.map(
        //             ({ last_rental_payment }) => last_rental_payment.getTime()
        //         );

        //     const minConfirmedRentalTime = _.min(confirmedRentalTimes);
        //     logger.info(`minConfirmedRentalTime: ${minConfirmedRentalTime}`);

        //     if (neverConfirmedSellTxs?.length > 0) {
        //         const neverConfirmedCreatedDates = await HiveTxDate.query()
        //             .select('hive_created_at')
        //             .whereIn('hive_tx_id', neverConfirmedSellTxs.rows);

        //         logger.info(
        //             `neverConfirmedCreatedDates: ${neverConfirmedCreatedDates}`
        //         );
        //         const createdTimes = neverConfirmedCreatedDates.map(
        //             ({ hive_created_at }) => hive_created_at?.getTime()
        //         );
        //         if (createdTimes) {
        //             const minCreatedDate = _.min(createdTimes);
        //             logger.info(
        //                 `minCreatedDate: ${minCreatedDate}, createdTimes: ${createdTimes}`
        //             );
        //         } else {
        //             logger.info(`createdTimes: ${createdTimes}`);
        //         }
        //     } else {
        //         return minConfirmedRentalTime;
        //     }

        //     // if matchingTxs.length === distinctNullRentalTxs, we have no extra non ids, aka everything is good.  If there is discrepancy, we're in trouble

        //     // things we need to do:
        //     // 1) get the earliest date that we need to go through confirmation process.
        //     // 1a) get the earliest of the confirmedDates that we already have in our sql query
        //     // 1b) get the rental sell_trx_ids that have NEVER BEEN CONFIRMED (testSql actually does that, but we could also just query the hive_tx_date table as well to find em, although we'd need a join anyway since they don't have a users_id on that)
        //     // 1c) search in hive_tx_dates for the sell_trx_ids, and get back the created_at dates
        //     // 1d) get the farthest back out of all of them (_.min)

        //     // 2) optimize the whole process of searching in a db via indexes (imo) https://dba.stackexchange.com/questions/33196/multicolumn-index-and-performance/33220#33220
        //     // logger.info(
        //     //     `latestConfirmedBySellIdForUser.rows: ${JSON.stringify(
        //     //         latestConfirmedBySellIdForUser.rows
        //     //     )}`
        //     // );
        //    // throw new Error('checking');
        //     // TNT TODO: WE NEED TO GET IT SO THAT we have an object where you can search by sell_trx_id, and it has the most recent date that a sell_trx_id has been confirmed on it.
        //     // In order to do this, we need to get the userRentals with the most recent sell_trx_id, and also get the hive_tx_date and checkout its most recent confirmed, and see which one has the most recent date on it.  It should never be more back than the hive_tx_date, if it is we have an issue
        //     // if (username === 'xdww' || username === 'tamecards') {
        //     //     logger.info(
        //     //         `rentalsToConfirm.length: ${rentalsToConfirm.length}, rentalsConfirmed.length: ${rentalsConfirmed.length}`
        //     //     );
        //     //     throw new Error(
        //     //         'checking the number of null for both to make sure its correct'
        //     //     );
        //     // }
        //     // return;
        //     // we get all of the ones we need to confirm,
        //     // we then need to sort them all by the most recent date, and then we can get the earliest of all of these and go back and find
        //     // the earliest date that we should use.
        //     // TNT NOTE: we also need to make sure that all the sellTrxIds in our rentalsToConfirm === the nmumber of sell_trx_ids that we have in the db, otherwise we need to go back to when it was created
        //     // IF THERE ARENT ANY, then we need to add the created_at of the sellTrxId transactions that aren't included, and include that in what we ultimately find for the last shit

        //     // TNT TODO:

        //     // const earliestMarketId = getEarliestDateNeeded({
        //     //     rentalsConfirmed,
        //     //     sellTrxIds,
        //     // });

        //     /*
        // TODO:
        // we need to check if there are rows of recent confirmed rentals, if there are not, then we need to go through and do the old way of going back to the beginnning of the earleist createdDate
        // */
        //     // if (recentConfirmedRentals) {
        //     //     // if they have any, then xd
        //     // } else {
        //     //     // if not, then we need to do old way
        //     // }

        //     // // TNT NOTE:
        //     // // WE want to be able to only need to look far back enough, we want to essentially be able to
        // // only go back to the sell_trx_ids that we DONT have one confirmed for
        // return;
        //   }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/patchRentalsBySplintersuite error: ${err.message}`
        );
        throw err;
    }
};

const getEarliestTimeNeeded = async ({
    users_id,
    username,
    anyRentalsToConfirm,
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/getEarliestDateNeeded`);

        const confirmedTxs = await getConfirmedTxs({
            users_id,
            username,
            anyRentalsToConfirm,
        });

        const nonConfirmedTxs = await getNeverConfirmedTxs({
            users_id,
            username,
            confirmedTxs,
            anyRentalsToConfirm,
        });

        const earliestTime = await calculateEarliestTime({
            username,
            confirmedTxs,
            nonConfirmedTxs,
        });

        logger.info(
            `/services/rentalConfirmation/getEarliestDateNeeded: ${username} earliestTime: ${earliestTime}, anyRentalsToConfirm: ${anyRentalsToConfirm?.length}`
        );
        return earliestTime;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getEarliestDateNeeded error: ${err.message}`
        );
        throw err;
    }
};

const calculateEarliestTime = async ({
    username,
    confirmedTxs,
    nonConfirmedTxs,
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/calculateEarliestTime`);
        const allTimes = [];

        for (const confirmed of confirmedTxs) {
            const { last_rental_payment } = confirmed;
            const payment_time = last_rental_payment.getTime();
            allTimes.push(payment_time);
        }
        for (const nonConfirmed of nonConfirmedTxs) {
            const { hive_created_at } = nonConfirmed;
            const created_time = hive_created_at.getTime();
            allTimes.push(created_time);
        }

        const earliestTime = _.min(allTimes);
        logger.info(
            `/services/rentalConfirmation/calculateEarliestTime: ${username} earliestTime: ${earliestTime}, confirmedTxs: ${confirmedTxs?.length}, nonConfirmedTxs: ${nonConfirmedTxs?.length}`
        );
        return earliestTime;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/calculateEarliestTime error: ${err.message}`
        );
        throw err;
    }
};
// TNT TODO: imo we should pass in the Ids that weren't in the confirmedOnes too imo
const getNeverConfirmedTxs = async ({
    users_id,
    username,
    confirmedTxs,
    anyRentalsToConfirm,
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/getNeverConfirmedTxs`);

        if (
            !confirmedTxs ||
            !Array.isArray(confirmedTxs) ||
            confirmedTxs?.length < 1
        ) {
            const neverConfirmedTxs = await getHiveTxDates({
                username,
                rentalsWithSellIds: anyRentalsToConfirm,
            });
            logger.info(
                `/services/rentalConfirmation/getNeverConfirmedTxs: neverConfirmedTxs: ${neverConfirmedTxs?.length}`
            );
            return neverConfirmedTxs;
        } else {
            // TNT TNODO: add an is null for confirmed to this imo
            // TNT TODO: checkout confirmedTxs, I think we need to have it be mapped out for just sell_trx_hive_id first before this query would do anything imo

            logger.info(`confirmedTxs: ${JSON.stringify(confirmedTxs)} `);
            const confirmedIds = confirmedTxs.map(
                ({ sell_trx_hive_id }) => sell_trx_hive_id
            );
            // const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur WHERE users_id = ? AND NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
            // const neverConfirmedSellTxs = await knexInstance.raw(
            //     neverConfirmedSellTxsSql,
            //     [users_id, confirmedIds]
            // );

            const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur WHERE users_id = ? AND confirmed IS NULL AND NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
            const neverConfirmedSellTxs = await knexInstance.raw(
                neverConfirmedSellTxsSql,
                [users_id, confirmedIds]
            );
            // const distinctNotNullRentalTxs = await UserRentals.query()
            //     .where({ users_id })
            //     .whereNotNull('confirmed')
            //     .distinctOn('sell_trx_hive_id');

            // const distinctNullRentalTxs = await UserRentals.query()
            //     .where({ users_id })
            //     .whereNull('confirmed')
            //     .distinctOn('sell_trx_hive_id');

            // const distinctRentalTxsUser = await UserRentals.query()
            //     .where({ users_id })
            //     .distinctOn('sell_trx_hive_id');
            // logger.info(
            //     `neverConfirmedSellTxs.rows.length: ${neverConfirmedSellTxs?.rows?.length}, neverConfirmedNullSellTxs.rows.length: ${neverConfirmedNullSellTxs?.rows?.length}, confirmedTxs: ${confirmedTxs.length}, anyRentalsToConfirm: ${anyRentalsToConfirm.length}, distinctNotNullRentalTxs: ${distinctNotNullRentalTxs.length}, distinctNullRentalTxs: ${distinctNullRentalTxs.length}, distinctRentalTxsUser: ${distinctRentalTxsUser.length}`
            // );
            // throw new Error('checking getNeverCOnfirmedTxs');
            if (
                !neverConfirmedSellTxs ||
                !Array.isArray(neverConfirmedSellTxs) ||
                neverConfirmedSellTxs?.length < 1
            ) {
                logger.info(
                    `/services/rentalConfirmation/getNeverConfirmedTxs: user: ${username} has no rentals never confirmed`
                );
                return [];
            } else {
                const neverConfirmedTxs = await getHiveTxDates({
                    username,
                    rentalsWithSellIds: neverConfirmedSellTxs.rows,
                });
                logger.info(
                    `/services/rentalConfirmation/getNeverConfirmedTxs: neverConfirmedSellTxs.rows: ${neverConfirmedSellTxs.rows}, neverConfirmedSellTxs.rows.length: ${neverConfirmedSellTxs.rows?.length}`
                );
                return neverConfirmedTxs;
                // const neverConfirmedTxs = await HiveTxDate.query()
                //     .select('hive_tx_id', 'hive_created_at')
                //     .whereIn('hive_tx_id', neverConfirmedSellTxs.rows);
                // if (
                //     !neverConfirmedTxs ||
                //     !Array.isArray(neverConfirmedTxs) ||
                //     neverConfirmedTxs?.length < 1
                // ) {
                //     logger.warn(
                //         `/services/rentalConfirmation/getNeverConfirmedTxs: ${username} has ${neverConfirmedSellTxs?.rows?.length} but HiveTxDate doesnt have these rows, neverConfirmedSellTxs?.rows: ${neverConfirmedSellTxs?.rows}`
                //     );
                //     throw new Error(
                //         `HiveTxDate missing rows for user: ${username}`
                //     );
                // } else {
                //     logger.info(
                //         `/services/rentalConfirmation/getNeverConfirmedTxs: ${username} neverConfirmedTxs: ${neverConfirmedTxs?.length}`
                //     );
                //     return neverConfirmedTxs;
                // }
            }
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getNeverConfirmedTxs error: ${err.message}`
        );
        throw err;
    }
};

const getHiveTxDates = async ({ username, rentalsWithSellIds }) => {
    try {
        logger.debug(`/services/rentalConfirmation/getHiveTxDates`);

        const rentalTxIds = rentalsWithSellIds.map(({ sell_trx_hive_id }) => {
            sell_trx_hive_id;
        });

        const neverConfirmedTxs = await HiveTxDate.query()
            .select('hive_tx_id', 'hive_created_at')
            .whereIn('hive_tx_id', rentalTxIds);

        if (
            !neverConfirmedTxs ||
            !Array.isArray(neverConfirmedTxs) ||
            neverConfirmedTxs?.length < 1
        ) {
            logger.warn(
                `/services/rentalConfirmation/getHiveTxDates ${username} has ${
                    rentalsWithSellIds?.length
                } but HiveTxDate doesnt have these rows, rentalsWithSellIds: ${JSON.stringify(
                    rentalsWithSellIds
                )}`
            );
            throw new Error(`HiveTxDate missing rows for user: ${username}`);
        } else {
            logger.info(
                `/services/rentalConfirmation/getHiveTxDates: ${username} neverConfirmedTxs: ${neverConfirmedTxs?.length}`
            );
            return neverConfirmedTxs;
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getHiveTxDates error: ${err.message}`
        );
        throw err;
    }
};

const getConfirmedTxs = async ({ users_id, username, anyRentalsToConfirm }) => {
    try {
        logger.debug(`/services/rentalConfirmation/getConfirmedTxs`);
        // logger.info(
        //     `getConfirmedTxs, anyRentalsToConfirm: ${JSON.stringify(
        //         anyRentalsToConfirm
        //     )}, users_id: ${users_id}`
        // );
        // TNT TODO: the anyRentalsToConfirm needs to be mapped in imo by sell_trx_hive_id and we can only query those in this list imo, everything else is irrelevant
        // const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        // const latestConfirmedByRentalIdForUser = await knexInstance.raw(
        //     latestConfirmedByUserSql,
        //     users_id
        // );

        // get all the distinct user_rental.sell_trx_hive_id that have at least one value where confirmed is not null, and is one of the sell_trx_ids of anyRentalsToConfirm
        const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? AND sell_trx_hive_id = ANY(?) group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        const latestConfirmedByRentalIdForUser = await knexInstance.raw(
            latestConfirmedByUserSql,
            [users_id, anyRentalsToConfirm]
        );
        // logger.info(
        //     `username: ${username}, latestConfirmedByRentalIdForUser.rows.length: ${latestConfirmedByRentalIdForUser.rows?.length}, anyLatestConfirmedByRentalIdForUser.rows.length: ${anyLatestConfirmedByRentalIdForUser?.rows?.length} anyRentalsToConfirm.length: ${anyRentalsToConfirm?.length}`
        // );
        // throw new Error('checking');
        if (
            !Array.isArray(latestConfirmedByRentalIdForUser.rows) ||
            latestConfirmedByRentalIdForUser.rows?.length === 0
        ) {
            logger.warn(
                `/services/rentalConfirmation/getConfirmedTxs no confirmed sell_trx_hive_ids for username ${username}`
            );
            return [];
        } else {
            return latestConfirmedByRentalIdForUser.rows;
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getConfirmedTxs error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    confirmRentalsForUsers,
    patchRentalsBySplintersuite,
};
