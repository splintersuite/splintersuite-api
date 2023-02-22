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
// const { updateHiveTxDates } = require('./hive/dates');
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
        //   const users = await Users.query();
        const usernames = ['xdww', 'tamecards'];
        const users = await Users.query().whereIn('username', usernames);
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
                if (numRecords % 100 === 0) {
                    logger.info(`user: ${username} numRecords: ${numRecords}`);
                }
                if (record?.isPriceUpdate) {
                    await UserRentals.query(trx)
                        .where({ users_id })
                        .where('last_rental_payment', '>=', record.time)
                        .whereIn('sell_trx_id', record.IDs)
                        .patch({ confirmed: record.isSplintersuite });
                } else {
                    // TNT TODO: we get rid of this part, and we just make it so that the first never confirmed user_rental always gets set to what it should be, but then we have to actually finish going through the history of shit before it all ultimately ends up being fine.  Therefore,
                    // we should have the if statemetn really being the processing of the neverConfirmed for sell_trx_ids first, where we use this except go through and just patch each specific last_sell_trx id of the min(last_rental_payment) date.
                    // and then after we finish that processing, THEN we go through all of these regular records and IGNORE the card_uid stuff, but keep everything related to record?.isPriceUpdate
                    // THE REASON FOR THIS IS BECAUSE WE WANT TO ONLY BE PATCHING SPECIFIC SELL_TRX_IDS WHEN WE GO BACK IN TIME, AND THIS WAY WOULD MAKE US ACCOUNT FOR EVERY SINGLE SELL_TRX_ID WHEN WE GO BACK, even if we just need to update 1 of them
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
        // essentially any userRentals that havent been confirmed
        const anyRentalsToConfirmArr = await UserRentals.query()
            .select(
                'sell_trx_id',
                'id',
                'last_rental_payment',
                'sell_trx_hive_id'
            )
            .where({ users_id })
            .whereNull('confirmed')
            .distinctOn('sell_trx_id');
        if (
            !anyRentalsToConfirmArr ||
            !Array.isArray(anyRentalsToConfirmArr) ||
            anyRentalsToConfirmArr.length < 1
        ) {
            logger.info(`${username} no new User Rentals to confirm`);
            return;
        }

        const anyRentalsToConfirm = anyRentalsToConfirmArr.map(
            ({ sell_trx_id }) => sell_trx_id
        );

        // TNT NOTE: we should NEVER get the earliestTime unless we already had a prior confirmed.  If we don't have any prior confirmed, earliestTime should be null, and we should have our sell_trx_ids with the created_date of the hive stuff later
        const { earliestTime, uniqSellTrxIdsObj } = await getEarliestTimeNeeded(
            {
                users_id,
                username,
                anyRentalsToConfirm,
            }
        );

        // TNT TODO: check to see if we get back any neverConfirmedTxs, and if we do, we should make sure to just apply to the unique id of the user rental the confirmation status of the created_at.

        // 1) if there are neverConfirmedRentalTxs, we need to get the sell_trx_ids and make sure to exclude them in the handleUnconfirmedRentals function later so that they are ignored with this whole shtick (because we wouldnt have included them in the patchRentalsWithRelistings)

        //  2) we need to specifically patch them with a new function meant to only apply to each individual sell_trx_id record

        // we can ignore all the other stuff for that sell_trx_id, as we can just patch it in in the future, rather than have to go back really far imo.  We should do this thought after the handleUnconfirmed stuff
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

        // TNT TODO: make a function that runs before this imo, we should have it ignore any sell_trx_ids that were in our previous never confirmed stuff
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

// TNT TODO: we will need to handle the deleted userRentals, so we should get the info as well from the hiveTxDates for those where its appropriate
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
        // IMO, we should make this query so that it gets all of these sell_trx_ids, EXCEPT FOR THE ONES THAT WERE NEVER CONFIRMED!
        // that way, we don't have it just use the first confirmed for literally everything, since we aren't going as far back in the hive stuff as before imo
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

// TNT TODO: add a check in here to check the earliestTime, if for some reason the last_rental_payment is BEFORE the earliest time, we should NEVER patch this, and instead need to alert us in logging ASAP!
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
                    .where('last_rental_payment', '>=', last_rental_payment)
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

// TNT NOTE: we need to return more than just the earliest time imo, we should return the earliestTime AND also return a list of neverConfirmedTxs based on the MIN of the max date of last_rental_payment (and distinct on rental_tx_id), and make sure that we patch this first with the hive_tx_date confirmed column imo
// we need to return the sell_trx_ids in an Object that we want to capture (both the confirmed sell_trx_ids and the nonconfirmed sell_trx_ids, we also need to return back the earliest time.  We also need to return the array of nonConfirmedTxs so that we can patch them first in the overall transaction)
const getEarliestTimeNeeded = async ({
    users_id,
    username,
    anyRentalsToConfirm,
}) => {
    try {
        logger.info(
            `/services/rentalConfirmation/getEarliestDateNeeded anyRentalsToConfirm: ${anyRentalsToConfirm?.length}`
        );

        let earliestTime = null; // only if there are confirmedTxs do we care about the last_rental_payment_date
        let neverConfirmedRentalTxs = []; // if there are neverConfirmedTxs, this an array of objects to patch (has id of earliest sell_trx_id in user_rentals table incase this has gone on more than once, sell_trx_hive_id, created_at date from hiveTxDate, and confirmed from there as well to see status when created)

        // this will patch the first of any neverConfirmed, so the rest can then be dealt with in the getConfirmedTxs and subsequent patching
        // TNT NEW NOTE: we shouldnt patch anything here, but we can have this patching ultimately happen in the same overall transaction as our regular stuff imo
        // await updateNeverConfirmedTxs({
        //     users_id,
        //     username,
        //     anyRentalsToConfirm,
        // });
        let allSellTrxIds = {};
        // we can map out the sell_trx_ids from this cuz its already in the rows
        const confirmedTxs = await getConfirmedTxs({
            users_id,
            username,
            anyRentalsToConfirm,
        });

        const uniqConfirmedIds = confirmedTxs.map(
            ({ sell_trx_id }) => sell_trx_id
        );

        // TNT TODOS: we need to get an array of both the sell_trx_ids that are unique, as well as the card_uids that are unique.  This is so we can look up and see if they're relevant to what we want or not.  If they are not, then we can just fud
        // TNT MORE: actually, we can just literally get this info from anyRentalsToConfirm (and use that info to make sure as a check that we only have x amount of sell_trx_ids )
        /*
        return {
                neverConfirmedTimes: neverConfirmedTxs,
                sellTrxIds: individualSellTrxIds,
            };
            */
        const nonConfirmedTxs = await getNeverConfirmedTxs({
            users_id,
            username,
            uniqConfirmedIds,
            anyRentalsToConfirm,
            // anyRentalsToConfirm, TNT NOTE: we actually do want to pass this in imo, but because we only want to be able to look up only the shit in here too imo, rather than all of the never confirmed ever, even though technically it should never stray. If we just added new rentals recently, then this could cause issues imo cuz the hive dates wouldn't be updated?
        });

        // return {
        //     neverConfirmedTimes: neverConfirmedTxs,
        //     sellTrxIds: individualSellTrxIds,
        // };
        if (
            confirmedTxs &&
            Array.isArray(confirmedTxs) &&
            confirmedTxs?.length > 0
        ) {
            earliestTime = await calculateEarliestTime({
                username,
                confirmedTxs,
                nonConfirmedTxs: nonConfirmedTxs?.neverConfirmedTimes,
            });
        }
        /*

           const individualSellTrxIds = [];

                for (const rental of neverConfirmedSellTxs.rows) {
                    const { sell_trx_id } = rental;
                    individualSellTrxIds.push(...sell_trx_id);
                }
                */

        const msInADay = 1000 * 60 * 60 * 24;

        logger.info(
            `/services/rentalConfirmation/getEarliestDateNeeded: ${username} earliestTime: ${earliestTime}, anyRentalsToConfirm: ${anyRentalsToConfirm?.length}, neverConfirmedRentalTxs: ${neverConfirmedRentalTxs?.length}, confirmedTxs: ${confirmedTxs?.length}, neverConfirmedTimes: ${nonConfirmedTxs?.neverConfirmedTimes?.length}, sellTrxIds:${nonConfirmedTxs?.sellTrxIds?.length}`
        );
        throw new Error(
            'checking to see if anyRetnalsToConfirm equals length of confirmed + nonConfirmed'
        );
        return { earliestTime, uniqSellTrxIdsObj: neverConfirmedRentalTxs };
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getEarliestDateNeeded error: ${err.message}`
        );
        throw err;
    }
};

const updateNeverConfirmedTxs = async ({
    users_id,
    username,
    anyRentalsToConfirm,
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/updateNeverConfirmedTxs`);

        const priorConfirmedTxs = await getConfirmedTxs({
            users_id,
            username,
            anyRentalsToConfirm,
        });

        const confirmedIds = priorConfirmedTxs.map(
            ({ sell_trx_id }) => sell_trx_id
        );

        const uniqConfirmedIds = _.uniq(confirmedIds);

        const neverConfirmedTxs = await getNeverConfirmedTxs({
            users_id,
            username,
            uniqConfirmedIds,
        });

        if (
            !neverConfirmedTxs ||
            !Array.isArray(neverConfirmedTxs) ||
            neverConfirmedTxs?.length < 1
        ) {
            logger.info(
                `/services/rentalConfirmation/updateNeverConfirmedTxs: user ${username} has no neverConfirmedTxs`
            );
            return;
        }
        // need to patch in these changes in a new function that actually patches this
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/updateNeverConfirmedTxs error: ${err.message}`
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
        // logger.info(
        //     `/services/rentalConfirmation/calculateEarliestTime username: ${username} confirmedTxs: ${JSON.stringify(
        //         confirmedTxs
        //     )}, nonConfirmedTxs: ${JSON.stringify(nonConfirmedTxs)},
        //     Array.isArray(confirmedTxs): ${Array.isArray(confirmedTxs)},
        //     `
        // );
        if (
            confirmedTxs &&
            Array.isArray(confirmedTxs) &&
            confirmedTxs.length > 0
        ) {
            for (const confirmed of confirmedTxs) {
                const { last_rental_payment } = confirmed;
                const payment_time = last_rental_payment.getTime();
                allTimes.push(payment_time);
                // logger.info(
                //     `last_rental_payment: ${last_rental_payment}, payment_time: ${payment_time}, allTimes: ${JSON.stringify(
                //         allTimes
                //     )}`
                // );
                // throw new Error('checking');
            }
        }
        if (
            nonConfirmedTxs &&
            Array.isArray(nonConfirmedTxs) &&
            nonConfirmedTxs.length > 0
        ) {
            logger.info(`nonConfirmedTxs should get looped over`);
            //  throw new Error('checking loop');
            for (const nonConfirmed of nonConfirmedTxs) {
                const { hive_created_at } = nonConfirmed;
                const created_time = hive_created_at.getTime();
                allTimes.push(created_time);
            }
        }

        const earliestTime = _.min(allTimes);
        logger.info(
            `/services/rentalConfirmation/calculateEarliestTime: allTimes: ${JSON.stringify(
                allTimes
            )}, ${username} earliestTime: ${earliestTime}, earliestDate: ${new Date(
                earliestTime
            )}, confirmedTxs: ${confirmedTxs?.length}`
        );
        return earliestTime;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/calculateEarliestTime error: ${err.message}`
        );
        throw err;
    }
};
// updateNeverConfirmedTxs
// we should have this run FIRST, before confirmedTxs and then only after should we run the normal confirmedTxs function, because we don't want to have it copy the only created_at stuff imo, and just gather back in time all at once too.
const getNeverConfirmedTxs = async ({
    users_id,
    username,
    uniqConfirmedIds,
    anyRentalsToConfirm, // array of UNIQUE sell_trx_ids
}) => {
    try {
        // https://stackoverflow.com/questions/3907354/select-with-multiple-subqueries-to-same-table
        logger.info(`/services/rentalConfirmation/getNeverConfirmedTxs`);
        if (
            !uniqConfirmedIds ||
            !Array.isArray(uniqConfirmedIds) ||
            uniqConfirmedIds?.length < 1
        ) {
            // we dont need to check if empty cuz this would've already returned earlier when we had no null confirmed transactions
            // we don't have any confirmed transactions, which means that all null sell_trx_ids have never been confirmed before.
            // we need to get them all back with the first last_rental_payment date (aka the first/earliest one aka min)
            // TNT TODO: we need to get the hiveTxDates confirmed status for the sell_trx_hive_id, don't want to query more than once to get this info, and also need to get all of the individual sell_trx_ids updated with this info imo
            // we should have a function that puts all of this information into an object with all the min(last_rental_payment) sell_trx_ids and then use this object and patch everything in the db

            // object should be the key is the hive_trx_hive_id (the one without the -cardNum69 at end)
            // this query gets the first user_rental for the operation that has ever existed it seems
            // const firstRentalsNeverConfirmedSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id, ur.last_rental_payment, ur.id FROM user_rentals ur JOIN (SELECT sell_trx_id, min(last_rental_payment) min_date FROM user_rentals WHERE confirmed IS NULL AND users_id = ? group by sell_trx_id) min_ur on ur.sell_trx_id = min_ur.sell_trx_id AND ur.last_rental_payment = min_ur.min_date`;
            // const firstRentalsNeverConfirmed = await knexInstance.raw(
            //     firstRentalsNeverConfirmedSql,
            //     [users_id]
            // );

            // const neverConfirmedArr = await buildNeverConfirmedToPatch({
            //     username,
            //     firstRentalsNeverConfirmed: firstRentalsNeverConfirmed?.rows,
            // });
            // throw new Error(
            //     `this says there are no confirmedTxs for user: ${username}, seems like a mistake`
            // );
            // return neverConfirmedArr;
            logger.info(
                `THERE ARE NO CONFIRMED IDS APARENTLY, uniqConfirmedIds: ${
                    uniqConfirmedIds?.length
                }, uniqConfirmedIds: ${JSON.stringify(uniqConfirmedIds)},
                anyRentalsToConfirm.length: ${anyRentalsToConfirm?.length}`
            );
            const individualSellTrxIds = [];

            const anyRentalsToConfirm = await UserRentals.query()
                .select(
                    'sell_trx_hive_id',
                    'last_rental_payment',
                    'id',
                    'sell_trx_id'
                )
                .where({ users_id })
                .whereIn('sell_trx_id', anyRentalsToConfirm)
                .whereNull('confirmed')
                .distinctOn('sell_trx_id');

            if (username === 'tamecards') {
                logger.info(
                    `anyRentalsToConfirm: ${JSON.stringify(
                        anyRentalsToConfirm
                    )}, count: ${anyRentalsToConfirm?.length}`
                );
            }

            for (const rental of anyRentalsToConfirm) {
                const { sell_trx_id } = rental;
                individualSellTrxIds.push(sell_trx_id);
            }

            const neverConfirmedTxs = await getHiveTxDates({
                username,
                rentalsWithSellIds: anyRentalsToConfirm,
            });
            logger.info(
                `/services/rentalConfirmation/getNeverConfirmedTxs: neverConfirmedTxs: ${
                    neverConfirmedTxs?.length
                }, individualSellTrxIds.length: ${
                    individualSellTrxIds.length
                }, individualSellTrxIds: ${JSON.stringify(
                    individualSellTrxIds
                )}`
            );
            return {
                neverConfirmedTimes: neverConfirmedTxs,
                sellTrxIds: individualSellTrxIds,
            };
            //   return neverConfirmedTxs;
        } else {
            // logger.info(
            //     `THERE ARE SOME CONFIRMED TXs, uniqConfirmedIds: ${JSON.stringify(
            //         uniqConfirmedIds
            //     )}, uniqConfirmedIds.length: ${uniqConfirmedIds.length}`
            // );
            logger.info(
                `THERE ARE SOME CONFIRMED TXs uniqConfirmedIds.length: ${uniqConfirmedIds.length}, anyRentalsToConfirm.length: ${anyRentalsToConfirm?.length}`
            );
            const differenceInArrs = anyRentalsToConfirm.filter(
                (x) => !uniqConfirmedIds.includes(x)
            );

            logger.info(
                `differenceInArrs: ${JSON.stringify(
                    differenceInArrs
                )}, differenceInArrs.length: ${differenceInArrs.length}`
            );
            // we want to just get all the sell_trx_ids that have never been confirmed, so we can get the created_ats, but want to ignore the ones that have been confirmed once
            // if a sell_trx_hive_id has been confirmed once, than its inherent sell_trx_id has been confirmed AT LEAST ONCE (at inception), therefore we don't need the created_at for it (if its only confirmed there, then the date would already be in the confirmedTxs info)

            // const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id, ur.last_rental_payment, ur.id FROM user_rentals ur JOIN (SELECT urr.sell_trx_id, min(last_rental_payment) min_date FROM user_rentals urr WHERE confirmed IS NULL AND users_id = ? AND NOT EXISTS (SELECT urF.sell_trx_id from user_rentals urF WHERE urr.sell_trx_id = urF.sell_trx_id AND urF.sell_trx_id = ANY(?)) group by sell_trx_id) min_ur on ur.sell_trx_id = min_ur.sell_trx_id AND ur.last_rental_payment = min_ur.min_date`;

            // const neverConfirmedSellTxs = await knexInstance.raw(
            //     neverConfirmedSellTxsSql,
            //     [users_id, uniqConfirmedIds]
            // );
            // TNT NOTE TO SELF: we dont need to have the min_date selected here, because these are all rentals that NEVER had a confirmation.  So if we do this with patching every sell_trx_id that is equal or greater to the created_at date from the sell_trx_hive_id, and then have our relistings hive info patch any future changes, we should be good to go imo.
            // WE SHOULD ALSO CUT OUT EVERYTHING AFTER "AND NOT EXISTS", our difference in Arrs already solves this problem imo.

            /*
            const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id FROM user_rentals ur WHERE users_id = ? AND sell_trx_id = ANY(?) AND confirmed IS NULL AND NOT EXISTS (SELECT urF.sell_trx_id FROM user_rentals urF WHERE ur.sell_trx_id = urF.sell_trx_id and urF.sell_trx_id = ANY(?))`;
            // what about a query where we take the diffInArrs, and then we have the NOT EXISTS subquery be taking it from where we have a row that has confirmed being not null?  Therefore, we only need to look at the ones with differenceInArrs, and then we can subsequently look to see if any were confirmed (that we might've somehow missed b4)
            const neverConfirmedSellTxs = await knexInstance.raw(
                neverConfirmedSellTxsSql,
                [users_id, differenceInArrs, uniqConfirmedIds] // me: 12965.005 ms"}
                // [users_id, anyRentalsToConfirm, uniqConfirmedIds] // me: 110828.356 ms"}
            ); // {"level":30,"time":"2023-02-14T16:57:35.493Z","pid":27745,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/getEarliestDateNeeded: xdww earliestTime: undefined, anyRentalsToConfirm: 639, neverConfirmedRentalTxs: 0, confirmedTxs: 622, nonConfirmedTxs: undefined"}
            // {"level":30,"time":"2023-02-22T06:54:08.387Z","pid":48048,"hostname":"Trevors-Mac-mini.local","msg":"query.sql: SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id FROM user_rentals ur WHERE users_id = $1 AND sell_trx_id = ANY($2) AND confirmed IS NULL AND NOT EXISTS (SELECT urF.sell_trx_id FROM user_rentals urF WHERE ur.sell_trx_id = urF.sell_trx_id and urF.sell_trx_id = ANY($3))   Time: 21148.840 ms"}
            */
            // {"level":30,"time":"2023-02-22T07:07:28.272Z","pid":51235,"hostname":"Trevors-Mac-mini.local","msg":"query.sql: SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id FROM user_rentals ur WHERE users_id = $1 AND sell_trx_id = ANY($2) AND confirmed IS NULL   Time: 181.628 ms"}
            const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id FROM user_rentals ur WHERE users_id = ? AND sell_trx_id = ANY(?) AND confirmed IS NULL`;
            // what about a query where we take the diffInArrs, and then we have the NOT EXISTS subquery be taking it from where we have a row that has confirmed being not null?  Therefore, we only need to look at the ones with differenceInArrs, and then we can subsequently look to see if any were confirmed (that we might've somehow missed b4)
            const neverConfirmedSellTxs = await knexInstance.raw(
                neverConfirmedSellTxsSql,
                [users_id, differenceInArrs] // me: 12965.005 ms"}
                // [users_id, anyRentalsToConfirm, uniqConfirmedIds] // me: 110828.356 ms"}
            );
            if (
                !neverConfirmedSellTxs.rows ||
                !Array.isArray(neverConfirmedSellTxs.rows) ||
                neverConfirmedSellTxs?.rows?.length < 1
            ) {
                logger.info(
                    `/services/rentalConfirmation/getNeverConfirmedTxs: user: ${username} has no rentals never confirmed`
                );
                return {};
            } else {
                const unconfirmedTxsPatchArr = [];
                const individualSellTrxIds = [];
                const hiveCreatedDates = [];
                const hiveCreatedTimes = [];
                const hiveListingIds = neverConfirmedSellTxs.rows.map(
                    ({ sell_trx_hive_id }) => sell_trx_hive_id
                );
                const hiveTxDateObj = await getHiveTxDateObj({
                    username,
                    hiveListingIds,
                });

                for (const rentalTx of neverConfirmedSellTxs.rows) {
                    const { sell_trx_id, sell_trx_hive_id } = rentalTx;
                    const hiveInfo = hiveTxDateObj[sell_trx_hive_id];
                    // "hiveInfo: {\"hive_tx_id\":\"32a0ecd910907f67a58107973d3b2f9f0a4a0da6\",\"hive_created_at\":\"2023-02-06T09:19:54.000Z\",\"confirmed\":false}"}
                    if (hiveInfo && Object.keys(hiveInfo).length === 3) {
                        const { hive_created_at, confirmed } = hiveInfo;
                        const patchObj = {
                            hive_created_at,
                            confirmed,
                            sell_trx_id,
                        };
                        unconfirmedTxsPatchArr.push(patchObj);
                        individualSellTrxIds.push(sell_trx_id);
                        hiveCreatedDates.push(hive_created_at);
                        const hive_created_time = hive_created_at.getTime();
                        hiveCreatedTimes.push(hive_created_time);
                        // throw new Error('checking the hiveInfo');
                        /*
                        {"level":30,"time":"2023-02-22T06:54:08.404Z","pid":48048,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/getHiveTxDateObj: user: xdww, hiveTxDates: 7, hiveTxDateObj: 7"}
{"level":30,"time":"2023-02-22T06:54:08.404Z","pid":48048,"hostname":"Trevors-Mac-mini.local","msg":"hiveCreatedDates: [\"2023-02-06T09:19:54.000Z\",\"2023-02-03T02:32:24.000Z\",\"2023-02-06T22:52:57.000Z\",\"2023-02-06T22:52:57.000Z\",\"2023-02-06T22:52:57.000Z\",\"2023-02-06T22:52:57.000Z\",\"2023-02-06T22:52:57.000Z\",\"2023-02-03T08:04:24.000Z\",\"2023-02-03T10:44:57.000Z\",\"2023-01-30T03:57:39.000Z\",\"2023-01-30T03:57:39.000Z\",\"2023-01-30T03:57:39.000Z\",\"2023-01-30T03:57:39.000Z\",\"2023-01-30T03:57:39.000Z\",\"2023-01-30T03:57:39.000Z\",\"2023-01-30T03:57:39.000Z\",\"2023-02-03T19:08:33.000Z\"], individualSellTrxIds: [\"32a0ecd910907f67a58107973d3b2f9f0a4a0da6-0\",\"41f981efad38b99a0f801871b6d479329e125d3d-0\",\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-0\",\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-1\",\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-2\",\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-3\",\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-4\",\"9015e7342f5cccbc37a285b3fda682f7e57e3ede-0\",\"bbd397f27e283c79541931912b6b201e55d3da38-0\",\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-10\",\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-14\",\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-15\",\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-27\",\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-36\",\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-5\",\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-57\",\"f47547fb70d0c76e0596f46a36050970b86d2fde-0\"], unconfirmedTxsPatchArr: [{\"hive_created_at\":\"2023-02-06T09:19:54.000Z\",\"confirmed\":false,\"sell_trx_id\":\"32a0ecd910907f67a58107973d3b2f9f0a4a0da6-0\"},{\"hive_created_at\":\"2023-02-03T02:32:24.000Z\",\"confirmed\":false,\"sell_trx_id\":\"41f981efad38b99a0f801871b6d479329e125d3d-0\"},{\"hive_created_at\":\"2023-02-06T22:52:57.000Z\",\"confirmed\":false,\"sell_trx_id\":\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-0\"},{\"hive_created_at\":\"2023-02-06T22:52:57.000Z\",\"confirmed\":false,\"sell_trx_id\":\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-1\"},{\"hive_created_at\":\"2023-02-06T22:52:57.000Z\",\"confirmed\":false,\"sell_trx_id\":\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-2\"},{\"hive_created_at\":\"2023-02-06T22:52:57.000Z\",\"confirmed\":false,\"sell_trx_id\":\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-3\"},{\"hive_created_at\":\"2023-02-06T22:52:57.000Z\",\"confirmed\":false,\"sell_trx_id\":\"7540937b7ef73e0c3a2d1f056db8ac5ae3fde1e8-4\"},{\"hive_created_at\":\"2023-02-03T08:04:24.000Z\",\"confirmed\":false,\"sell_trx_id\":\"9015e7342f5cccbc37a285b3fda682f7e57e3ede-0\"},{\"hive_created_at\":\"2023-02-03T10:44:57.000Z\",\"confirmed\":false,\"sell_trx_id\":\"bbd397f27e283c79541931912b6b201e55d3da38-0\"},{\"hive_created_at\":\"2023-01-30T03:57:39.000Z\",\"confirmed\":true,\"sell_trx_id\":\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-10\"},{\"hive_created_at\":\"2023-01-30T03:57:39.000Z\",\"confirmed\":true,\"sell_trx_id\":\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-14\"},{\"hive_created_at\":\"2023-01-30T03:57:39.000Z\",\"confirmed\":true,\"sell_trx_id\":\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-15\"},{\"hive_created_at\":\"2023-01-30T03:57:39.000Z\",\"confirmed\":true,\"sell_trx_id\":\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-27\"},{\"hive_created_at\":\"2023-01-30T03:57:39.000Z\",\"confirmed\":true,\"sell_trx_id\":\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-36\"},{\"hive_created_at\":\"2023-01-30T03:57:39.000Z\",\"confirmed\":true,\"sell_trx_id\":\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-5\"},{\"hive_created_at\":\"2023-01-30T03:57:39.000Z\",\"confirmed\":true,\"sell_trx_id\":\"e2a390e9fbe40b1a862b10e051a2d7d9d7d9ecb1-57\"},{\"hive_created_at\":\"2023-02-03T19:08:33.000Z\",\"confirmed\":false,\"sell_trx_id\":\"f47547fb70d0c76e0596f46a36050970b86d2fde-0\"}]"}
*/
                    } else {
                        logger.warn(
                            `for sell_trx_id: ${sell_trx_id} and sell_trx_hive_id: ${sell_trx_hive_id}, we cant find anything in the hiveTxDateObj, hiveInfo: ${JSON.stringify(
                                hiveInfo
                            )}`
                        );
                        throw new Error(
                            'should get rid of this, but something is up with our hiveInfo'
                        );
                    }
                }
                const minHiveCreatedTime = _.min(hiveCreatedDates);
                logger.info(
                    `hiveCreatedDates: ${JSON.stringify(
                        hiveCreatedDates
                    )}, individualSellTrxIds: ${JSON.stringify(
                        individualSellTrxIds
                    )}, unconfirmedTxsPatchArr: ${JSON.stringify(
                        unconfirmedTxsPatchArr
                    )}, hiveCreatedTimes: ${JSON.stringify(
                        hiveCreatedTimes
                    )}, hiveCreatedTimes.length: ${
                        hiveCreatedTimes?.length
                    }, hiveCreatedDates.length: ${hiveCreatedDates?.length}, 
                    minHiveCreatedTime: ${JSON.stringify(
                        minHiveCreatedTime
                    )}, new Date(minHiveCreatedTime): ${new Date(
                        minHiveCreatedTime
                    )}`
                );
                // TNT TODO: we get rid of the hiveCreatedDates and just return the min of them all imo,
                throw new Error('checking one last time');
                // {"level":30,"time":"2023-02-16T11:00:54.482Z","pid":98024,"hostname":"Trevors-Mac-mini.local","msg":"neverConfirmedSellTxs.rows.length: 17, unconfirmedTxsPatchArr.length: 17, unconfirmedTxsPatchArr[0]: {\"hive_created_at\":\"2023-02-06T09:19:54.000Z\",\"confirmed\":false,\"sell_trx_id\":\"32a0ecd910907f67a58107973d3b2f9f0a4a0da6-0\"}"}

                // const neverConfirmedTxs = await getHiveTxDates({
                //     username,
                //     rentalsWithSellIds: neverConfirmedSellTxs.rows,
                // });

                logger.info(
                    `/services/rentalConfirmation/getNeverConfirmedTxs: 
                    }, individualSellTrxIds.length: ${
                        individualSellTrxIds.length
                    }, unconfirmedTxsPatchArr.length: ${
                        unconfirmedTxsPatchArr.length
                    }, hiveTxDateObj: ${
                        Object.keys(hiveTxDateObj).length
                    }, hiveListingIds: ${hiveListingIds?.length}`
                );
                return {
                    neverConfirmedTimes: neverConfirmedTxs,
                    sellTrxIds: individualSellTrxIds,
                };
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

const buildNeverConfirmedToPatch = async ({
    username,
    firstRentalsNeverConfirmed,
}) => {
    try {
        logger.info(`/services/rentalConfirmation/buildNeverConfirmedToPatch`);

        const rentalHiveTxIds = firstRentalsNeverConfirmed.map(
            ({ sell_trx_hive_id }) => sell_trx_hive_id
        );
        const uniqueHiveTxDates = _.uniq(rentalHiveTxIds);

        const hiveTxDateObj = await getHiveTxDateObj({
            username,
            hiveListingIds: uniqueHiveTxDates,
        });

        const neverConfirmedArr = [];
        for (const { sell_trx_hive_id, id } of firstRentalsNeverConfirmed) {
            const hiveTxDate = hiveTxDateObj[sell_trx_hive_id];
            if (!hiveTxDate) {
                logger.warn(
                    `/services/rentalConfirmation/buildNeverConfirmedToPatch sell_trx_hive_id: ${sell_trx_hive_id}, id: ${id} is not in the hiveTxDates object`
                );
                continue;
            }
            const { confirmed } = hiveTxDate;
            const rentalToConfirm = { id, confirmed };
            neverConfirmedArr.push(rentalToConfirm);
        }

        logger.info(
            `/services/rentalConfirmation/buildNeverConfirmedToPatch: user ${username}, neverConfirmedArr: ${neverConfirmedArr?.length}`
        );
        return neverConfirmedArr;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/buildNeverConfirmedToPatch error: ${err.message}`
        );
        throw err;
    }
};

// object should be the key is the hive_trx_hive_id (the one without the -cardNum69 at end)
// this query gets the first user_rental for the operation that has ever existed it seems
// hiveListingIds should be an array of UNIQUE sell_trx_hive_ids
const getHiveTxDateObj = async ({ username, hiveListingIds }) => {
    try {
        logger.debug(`/services/rentalConfirmation/getHiveTxDateObj`);

        const hiveTxDateObj = {};
        if (
            !hiveListingIds ||
            !Array.isArray(hiveListingIds) ||
            hiveListingIds?.length < 1
        ) {
            logger.info(
                `/services/rentalConfirmation/getHiveTxDateObj: no sell_trx_hive_ids input for user: ${username}`
            );
            return null;
        }
        const hiveDatesForEachId = await HiveTxDate.query()
            .select('hive_tx_id', 'hive_created_at', 'id', 'confirmed')
            .whereIn('hive_tx_id', hiveListingIds);

        if (
            !hiveDatesForEachId ||
            !Array.isArray(hiveDatesForEachId) ||
            hiveDatesForEachId.length < 1
        ) {
            logger.info(
                `/services/rentalConfirmation/getHiveTxDateObj: no hive_tx_ids user: ${username}`
            );
            return null;
        }

        for (const {
            hive_tx_id,
            hive_created_at,
            //      id,
            confirmed,
        } of hiveDatesForEachId) {
            hiveTxDateObj[hive_tx_id] = {
                hive_tx_id,
                hive_created_at,
                confirmed,
                //     id,
            };
        }
        logger.info(
            `/services/rentalConfirmation/getHiveTxDateObj: user: ${username}, hiveTxDates: ${
                hiveDatesForEachId?.length
            }, hiveTxDateObj: ${Object.keys(hiveTxDateObj)?.length}`
        );

        return hiveTxDateObj;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getHiveTxDateObj error: ${err.message}`
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

        const neverConfirmedTxs = await HiveTxDate.query()
            .select('hive_tx_id', 'hive_created_at', 'id')
            .whereIn('hive_tx_id', rentalTxIds);

        if (
            !neverConfirmedTxs ||
            !Array.isArray(neverConfirmedTxs) ||
            neverConfirmedTxs?.length < 1
        ) {
            logger.warn(
                `/services/rentalConfirmation/getHiveTxDates user ${username} has ${
                    rentalsWithSellIds?.length
                } sellTrx rentals and a total of ${
                    rentalTxIds?.length
                } rentalTxIds, but HiveTxDate doesnt have these rows, rentalsWithSellIds: ${JSON.stringify(
                    rentalsWithSellIds
                )}, rentalTxIds: ${JSON.stringify(rentalTxIds)}`
            );
            throw new Error(`HiveTxDate missing rows for user: ${username}`);
        } else {
            logger.info(
                `/services/rentalConfirmation/getHiveTxDates: ${username}, neverConfirmedTxs:${JSON.stringify(
                    neverConfirmedTxs
                )} neverConfirmedTxs.length: ${neverConfirmedTxs?.length}`
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

        const latestConfirmedByUserSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id, ur.last_rental_payment FROM user_rentals ur JOIN (SELECT sell_trx_id, max(last_rental_payment) max_date FROM user_rentals WHERE confirmed IS NOT NULL AND users_id = ? AND sell_trx_id = ANY(?) group by sell_trx_id) max_ur on ur.sell_trx_id = max_ur.sell_trx_id AND ur.last_rental_payment = max_ur.max_date`;
        const latestConfirmedByRentalIdForUser = await knexInstance.raw(
            latestConfirmedByUserSql,
            [users_id, anyRentalsToConfirm]
        );

        // TNT NOTE: we should actually just ideally structure the deletion of user rental data so that it keeps one of each sell_trx_id (that has a confirmed either null or not), and ONLY delete it if there is no listing/sell_trx_id on that account (can find from collection)
        // TNT NOTE: we would only want to delete everything except the max of last_rental_payment for the distinct sell_trx_id, assuming everything past a certain point (ie 4 weeks ago) needs to get deleted
        if (
            !Array.isArray(latestConfirmedByRentalIdForUser.rows) ||
            latestConfirmedByRentalIdForUser.rows?.length === 0
        ) {
            logger.warn(
                `/services/rentalConfirmation/getConfirmedTxs no confirmed sell_trx_hive_ids for username ${username}`
            );
            return [];
        } else {
            logger.info(
                `/services/rentalConfirmation/getConfirmedTxs: unique confirmed Txs from anyRentalsToConfirm: ${latestConfirmedByRentalIdForUser?.rows?.length}`
            );
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
