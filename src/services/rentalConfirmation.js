'use strict';
const logger = require('../util/pinologger');
const _ = require('lodash');
const Users = require('../models/Users');
const UserRentals = require('../models/UserRentals');
const retryFncs = require('../util/axios_retry/general');
const cardDetails = require('../util/cardDetails.json');
const utilDates = require('../util/dates');
const HiveTxDate = require('../models/HiveTxDate');
const knexInstance = require('../../db/index');
const { updateHiveTxDates } = require('./hive/dates');
const hiveService = require('./hive/relistings');
const nowp = require('performance-now');
const confirmRentalsForUsers = async () => {
    try {
        logger.debug(`/services/rentalConfirmation/confirmRentalsForUsers`);
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

            const numPatched = await patchRentalsBySplintersuite({
                users_id: user.id,
                username: user.username,
            });
            const end = new Date();
            const endTime = end.getTime();

            const minsLong = utilDates.computeMinsSinceStart({
                startTime,
                endTime,
            });
            timeSummary[user.username] = {
                minsLong,
                numPatched,
            };

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
            `/services/rentalConfirmation/confirmRentalsForUsers: timeSummary: ${JSON.stringify(
                timeSummary
            )}`
        );
        return timeSummary;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/confirmRentalsForUsers error: ${err.message}`
        );
        throw err;
    }
};

const patchRentalsWithRelistings = async ({
    users_id,
    username,
    recentHiveIDs,
}) => {
    try {
        logger.info(
            `/services/rentalConfirmation/patchRentalsWithRelistings ${username}`
        );
        let numRecords = 0;
        const timeTaken = await UserRentals.transaction(async (trx) => {
            const nowTime = nowp();
            for (const record of recentHiveIDs) {
                numRecords = numRecords + 1;
                if (record?.isPriceUpdate) {
                    await UserRentals.query(trx)
                        .where({ users_id })
                        .where('last_rental_payment', '>=', record.time)
                        .whereIn('sell_trx_id', record.IDs)
                        .patch({ confirmed: record.isSplintersuite });
                } else {
                    await UserRentals.query(trx)
                        .where({ users_id })
                        .where('last_rental_payment', '>=', record.time)
                        .whereIn('card_uid', record.IDs)
                        .patch({ confirmed: record.isSplintersuite });
                }
            }
            const endTime = nowp();
            const elapsedTime = endTime - nowTime;

            return elapsedTime.toFixed(3);
        });
        logger.info(
            `/services/rentalConfirmation/patchRentalsWithRelistings: user: ${username} numRecords: ${numRecords}, timeTaken: ${timeTaken} ms`
        );

        return numRecords;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/patchRentalsWithRelistings error: ${err.message}`
        );
        throw err;
    }
};

const patchRentalsBySplintersuite = async ({ users_id, username }) => {
    try {
        logger.info(
            `/services/rentalConfirmation/patchRentalsBySplintersuite ${username}`
        );

        // throw new Error('checking');
        // const numPatched1 = await patchRentalsWithRelistings({
        //     users_id: 'xdww',
        //     username: 'xdww',
        //     recentHiveIDs: 'xdww',
        // });
        // throw new Error('stopping');
        // const anyRentalsToConfirmArr = await UserRentals.query()
        //     .select('sell_trx_hive_id')
        //     .where({ users_id })
        //     .whereNull('confirmed')
        //     .distinctOn('sell_trx_hive_id');

        const anyRentalsToConfirmArr = await UserRentals.query()
            .select('sell_trx_id')
            .where({ users_id })
            .whereNull('confirmed')
            .distinctOn('sell_trx_id');
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

        if (username === 'tamecards') {
            logger.info(
                `anyRentalsToConfirmArr: ${JSON.stringify(
                    anyRentalsToConfirmArr
                )}`
            );
        }
        // const anyRentalsToConfirm = anyRentalsToConfirmArr.map(
        //     ({ sell_trx_hive_id }) => sell_trx_hive_id
        // );

        const anyRentalsToConfirm = anyRentalsToConfirmArr.map(
            ({ sell_trx_id }) => sell_trx_id
        );

        const earliestTime = await getEarliestTimeNeeded({
            users_id,
            username,
            anyRentalsToConfirm,
        });
        logger.info(
            `earliestTime: ${earliestTime}, date: ${new Date(earliestTime)}`
        );
        // throw new Error(`checking earliestTime for user: ${username}`);
        // TNT TODO: I think we need to add in the rentalIds in here along with the card_uids so we can ignore the records that don't have any of those (and also not patch them imo)
        const recentHiveIDs = await hiveService.getTransactionHiveIDsByUser({
            username,
            timeToStopAt: earliestTime,
        });

        const numPatched = await patchRentalsWithRelistings({
            users_id,
            username,
            recentHiveIDs,
        });
        // TNT NOTE: this is where we are, prob need to handle this imo
        const morePatched = await handleUnconfirmedRentals({
            users_id,
            username,
        });
        // TNT NOTE: we need to confirm any rentalIds that haven't been confirmed yet still (due to them not having any updated info in the hive shit), by then looking at the most recent rows of and taking their conifirmed status imo
        // imo, this would only involve the sell_trx_hive_id's

        // const rentalsStillNotConfirmed = await UserRentals.query()
        //     .where({ users_id })
        //     .whereNull('confirmed');

        // logger.info(
        //     `/services/rentalConfirmation/patchRentalsBySplintersuite: ${username}, numPatched: ${numPatched}, rentalsStillNotConfirmed: ${rentalsStillNotConfirmed?.length}, rentalsIdsStillNotConfirmed: ${rentalsIdsStillNotConfirmed?.length}`
        // );
        //throw new Error('checking');
        const totalPatched = numPatched + morePatched;
        logger.info(
            `/services/rentalConfirmation/patchRentalsBySplintersuite: user ${username}, numPatched: ${numPatched}, morePatched: ${morePatched}, totalPatched: ${totalPatched}`
        );
        return totalPatched;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/patchRentalsBySplintersuite error: ${err.message}`
        );
        throw err;
    }
};

const handleUnconfirmedRentals = async ({ users_id, username }) => {
    try {
        logger.info(
            `/services/rentalConfirmation/handleUnconfirmedRentals ${username}`
        );
        let numPatched = 0;
        const lastConfirmedRentals = await getPreviousConfirmationForRentalIds({
            users_id,
            username,
        });
        if (
            !lastConfirmedRentals ||
            !Array.isArray(lastConfirmedRentals) ||
            lastConfirmedRentals.length < 1
        ) {
            logger.info(
                `services/rentalConfirmation/handleUnconfirmedRentals: user ${username} no unconfirmed to patch`
            );
            return numPatched;
        }

        numPatched = await patchRentalsPrevHistory({
            users_id,
            username,
            lastConfirmedRentals,
        });
        logger.info(
            `services/rentalConfirmation/handleUnconfirmedRentals: user ${username} records: ${numPatched}`
        );
        return numPatched;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/handleUnconfirmedRentals error: ${err.message}`
        );
        throw err;
    }
};

const getPreviousConfirmationForRentalIds = async ({ users_id, username }) => {
    try {
        logger.debug(
            `/services/rentalConfirmation/getPreviousConfirmationForRentalIds`
        );
        // we can get the time period from the last confirmed transaction and apply it to future ones
        const rentalsIdsStillNotConfirmed = await UserRentals.query()
            // .select('sell_trx_hive_id')
            .where({ users_id })
            .whereNull('confirmed')
            .distinctOn('sell_trx_id');
        // .distinctOn('sell_trx_hive_id');

        if (
            !rentalsIdsStillNotConfirmed ||
            !Array.isArray(rentalsIdsStillNotConfirmed) ||
            rentalsIdsStillNotConfirmed.length < 1
        ) {
            logger.info(
                `/services/rentalConfirmation/getPreviousConfirmationForRentalIds: no ${username} rentals that still need to be confirmed`
            );
            return [];
        }

        // const idsNotConfirmed = rentalsIdsStillNotConfirmed.map(
        //     ({ sell_trx_hive_id }) => sell_trx_hive_id
        // );
        const idsNotConfirmed = rentalsIdsStillNotConfirmed.map(
            ({ sell_trx_id }) => sell_trx_id
        );
        // const getLastConfirmedTxsForRentalIdsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment, ur.confirmed FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? AND sell_trx_hive_id = ANY(?) group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        // const getLastConfirmedTxsForRentalIds = await knexInstance.raw(
        //     getLastConfirmedTxsForRentalIdsSql,
        //     [users_id, idsNotConfirmed]
        // );

        const getLastConfirmedTxsForRentalIdsSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.last_rental_payment, ur.confirmed FROM user_rentals ur JOIN (SELECT sell_trx_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? AND sell_trx_id = ANY(?) group by sell_trx_id) max_ur on ur.sell_trx_id = max_ur.sell_trx_id AND ur.last_rental_payment = max_ur.max_date`;
        const getLastConfirmedTxsForRentalIds = await knexInstance.raw(
            getLastConfirmedTxsForRentalIdsSql,
            [users_id, idsNotConfirmed]
        );

        // if (username === 'tamecards' || username === 'xdww') {
        //     logger.info(
        //         `user: ${username}, rentalIdsStillNotConfirmed: ${JSON.stringify(
        //             rentalsIdsStillNotConfirmed
        //         )}`
        //     );
        //     logger.info(
        //         `getLastConfirmedTxsForRentalIds: ${JSON.stringify(
        //             getLastConfirmedTxsForRentalIds.rows
        //         )}`
        //     );
        //     throw new Error('stopping at either tamecards or xdww');
        // }

        // logger.info(
        //     `getLastConfirmedTxsForRentalIds: ${JSON.stringify(
        //         getLastConfirmedTxsForRentalIds
        //     )}, getLastConfirmedTxsForRentalIds.rows.length: ${
        //         getLastConfirmedTxsForRentalIds?.rows?.length
        //     }`
        // );
        const lastConfirmedRentals = getLastConfirmedTxsForRentalIds.rows.map(
            ({
                // sell_trx_hive_id,
                sell_trx_id,
                last_rental_payment,
                confirmed,
            }) => ({
                //sell_trx_hive_id,
                sell_trx_id,
                last_rental_payment,
                confirmed,
            })
        );
        // logger.info(
        //     `lastConfirmedRentals: ${JSON.stringify(lastConfirmedRentals)}`
        // );
        logger.info(
            `/services/rentalConfirmation/getPreviousConfirmationForRentalIds: ${lastConfirmedRentals.length} for ${username}`
        );
        return lastConfirmedRentals;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getPreviousConfirmationForRentalIds error: ${err.message}`
        );
        throw err;
    }
};

const patchRentalsPrevHistory = async ({
    users_id,
    username,
    lastConfirmedRentals,
}) => {
    try {
        logger.info(
            `/services/rentalConfirmation/patchRentalsPrevHistory ${username}`
        );

        let numRecords = 0;
        const timeTaken = await UserRentals.transaction(async (trx) => {
            const nowTime = nowp();
            for (const record of lastConfirmedRentals) {
                numRecords = numRecords + 1;
                const { last_rental_payment, sell_trx_id, confirmed } = record;
                await UserRentals.query(trx)
                    .where({ users_id })
                    .where('last_rental_payment', '>', last_rental_payment)
                    .where({ sell_trx_id })
                    //  .whereNull({ confirmed })
                    .patch({ confirmed });
            }

            const endTime = nowp();
            const elapsedTime = endTime - nowTime;

            return elapsedTime.toFixed(3);
        });
        logger.info(
            `/services/rentalConfirmation/patchRentalsPrevHistory: user: ${username}, numRecords: ${numRecords}, timeTaken: ${timeTaken}`
        );
        return numRecords;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/patchRentalsPrevHistory error: ${err.message}`
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
        // TNT NOTE: I think this is all done, but I might've fucked something up
        const nonConfirmedTxs = await getNeverConfirmedTxs({
            users_id,
            username,
            confirmedTxs,
            // anyRentalsToConfirm,
        });
        // TNT NOTE: nothing to be done here imo
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
    //  anyRentalsToConfirm,
}) => {
    try {
        logger.info(`/services/rentalConfirmation/getNeverConfirmedTxs`);

        if (
            !confirmedTxs ||
            !Array.isArray(confirmedTxs) ||
            confirmedTxs?.length < 1
        ) {
            // we dont need to check cuz this would've already returned earlier
            const anyRentalsToConfirm = await UserRentals.query()
                .select('sell_trx_hive_id')
                .where({ users_id })
                .whereNull('confirmed')
                .distinctOn('sell_trx_hive_id');

            if (username === 'tamecards') {
                logger.info(
                    `anyRentalsToConfirm: ${JSON.stringify(
                        anyRentalsToConfirm
                    )}`
                );
            }
            const neverConfirmedTxs = await getHiveTxDates({
                username,
                rentalsWithSellIds: anyRentalsToConfirm,
            });
            logger.info(
                `/services/rentalConfirmation/getNeverConfirmedTxs: neverConfirmedTxs: ${neverConfirmedTxs?.length}`
            );
            return neverConfirmedTxs;
        } else {
            // we want to just get all the sell_trx_hive_ids that have never been confirmed, so we can get the created_ats, but want to ignore the confirmedTxs
            // if a sell_trx_hive_id has been confirmed once, than its inherent sell_trx_id has been confirmed AT LEAST ONCE (at inception), therefore we don't need the created_at for it (if its only confirmed there, then the date would already be in the confirmedTxs info)

            // logger.info(`confirmedTxs: ${JSON.stringify(confirmedTxs)} `);
            const confirmedIds = confirmedTxs.map(
                ({ sell_trx_hive_id }) => sell_trx_hive_id
            );

            const uniqConfirmedIds = _.uniq(confirmedIds);
            // const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur WHERE users_id = ? AND NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
            // const neverConfirmedSellTxs = await knexInstance.raw(
            //     neverConfirmedSellTxsSql,
            //     [users_id, confirmedIds]
            // );

            const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur WHERE users_id = ? AND confirmed IS NULL AND NOT EXISTS (SELECT urF.sell_trx_hive_id FROM user_rentals urF WHERE ur.sell_trx_hive_id = urF.sell_trx_hive_id and urF.sell_trx_hive_id = ANY(?))`;
            const neverConfirmedSellTxs = await knexInstance.raw(
                neverConfirmedSellTxsSql,
                [users_id, uniqConfirmedIds]
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
        logger.info(`/services/rentalConfirmation/getHiveTxDates`);

        const rentalTxIds = rentalsWithSellIds.map(
            ({ sell_trx_hive_id }) => sell_trx_hive_id
        );

        if (username === 'tamecards') {
            const oneEle = ['bob'];
            const threeEle = ['tnt', 'xdww', 'tnt69'];

            const oneEleMapped = oneEle.map((ele) => ele);
            const threeEleMapped = threeEle.map((ele) => ele);
            logger.info(`rentalTxIds: ${JSON.stringify(rentalTxIds)}`);
            logger.info(
                `rentalsWithSellIds: ${JSON.stringify(rentalsWithSellIds)}`
            );
            logger.info(
                `Array.isArray(rentalsWithSellIds): ${Array.isArray(
                    rentalsWithSellIds
                )}`
            );
            logger.info(
                `oneEleMapped: ${JSON.stringify(
                    oneEleMapped
                )}, threeEleMapped: ${JSON.stringify(threeEleMapped)}`
            );
        }
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

        // get all the distinct user_rental.sell_trx_hive_id that have at least one value where confirmed is not null, and is one of the sell_trx_ids of anyRentalsToConfirm
        // const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_hive_id) ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_hive_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? AND sell_trx_hive_id = ANY(?) group by sell_trx_hive_id) max_ur on ur.sell_trx_hive_id = max_ur.sell_trx_hive_id AND ur.last_rental_payment = max_ur.max_date`;
        // const latestConfirmedByRentalIdForUser = await knexInstance.raw(
        //     latestConfirmedByUserSql,
        //     [users_id, anyRentalsToConfirm]
        // );

        const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? AND sell_trx_id = ANY(?) group by sell_trx_id) max_ur on ur.sell_trx_id = max_ur.sell_trx_id AND ur.last_rental_payment = max_ur.max_date`;
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
