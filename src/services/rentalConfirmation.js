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
        const { earliestTime, neverConfirmedRentalTxs } =
            await getEarliestTimeNeeded({
                users_id,
                username,
                anyRentalsToConfirm,
            });

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
const getEarliestTimeNeeded = async ({
    users_id,
    username,
    anyRentalsToConfirm,
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/getEarliestDateNeeded`);

        let earliestTime = null; // only if there are confirmedTxs do we care about the last_rental_payment_date
        let neverConfirmedRentalTxs = null; // if there are neverConfirmedTxs, this an array of objects to patch (has id of earliest sell_trx_id in user_rentals table incase this has gone on more than once, sell_trx_hive_id, created_at date from hiveTxDate, and confirmed from there as well to see status when created)

        // this will patch the first of any neverConfirmed, so the rest can then be dealt with in the getConfirmedTxs and subsequent patching
        await updateNeverConfirmedTxs({
            users_id,
            username,
            anyRentalsToConfirm,
        });

        const confirmedTxs = await getConfirmedTxs({
            users_id,
            username,
            anyRentalsToConfirm,
        });

        if (
            confirmedTxs &&
            Array.isArray(confirmedTxs) &&
            confirmedTxs?.length > 0
        ) {
            earliestTime = await calculateEarliestTime({
                username,
                confirmedTxs,
            });
        }

        const msInADay = 1000 * 60 * 60 * 24;

        logger.info(
            `/services/rentalConfirmation/getEarliestDateNeeded: ${username} earliestTime: ${earliestTime}, anyRentalsToConfirm: ${anyRentalsToConfirm?.length}, neverConfirmedRentalTxs: ${neverConfirmedRentalTxs?.length}`
        );
        return { earliestTime, neverConfirmedRentalTxs };
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

const calculateEarliestTime = async ({ username, confirmedTxs }) => {
    try {
        logger.debug(`/services/rentalConfirmation/calculateEarliestTime`);
        const allTimes = [];

        for (const confirmed of confirmedTxs) {
            const { last_rental_payment } = confirmed;
            const payment_time = last_rental_payment.getTime();
            allTimes.push(payment_time);
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
            const firstRentalsNeverConfirmedSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id, ur.last_rental_payment, ur.id FROM user_rentals ur JOIN (SELECT sell_trx_id, min(last_rental_payment) min_date FROM user_rentals WHERE confirmed IS NULL AND users_id = ? group by sell_trx_id) min_ur on ur.sell_trx_id = min_ur.sell_trx_id AND ur.last_rental_payment = min_ur.min_date`;
            const firstRentalsNeverConfirmed = await knexInstance.raw(
                firstRentalsNeverConfirmedSql,
                [users_id]
            );

            const neverConfirmedArr = await buildNeverConfirmedToPatch({
                username,
                firstRentalsNeverConfirmed: firstRentalsNeverConfirmed?.rows,
            });
            throw new Error(
                `this says there are no confirmedTxs for user: ${username}, seems like a mistake`
            );
            return neverConfirmedArr;
        } else {
            // we want to just get all the sell_trx_ids that have never been confirmed, so we can get the created_ats, but want to ignore the ones that have been confirmed once
            // if a sell_trx_hive_id has been confirmed once, than its inherent sell_trx_id has been confirmed AT LEAST ONCE (at inception), therefore we don't need the created_at for it (if its only confirmed there, then the date would already be in the confirmedTxs info)

            const neverConfirmedSellTxsSql = `SELECT distinct on (sell_trx_id) ur.sell_trx_id, ur.sell_trx_hive_id, ur.last_rental_payment, ur.id FROM user_rentals ur JOIN (SELECT urr.sell_trx_id, min(last_rental_payment) min_date FROM user_rentals urr WHERE confirmed IS NULL AND users_id = ? AND NOT EXISTS (SELECT urF.sell_trx_id from user_rentals urF WHERE urr.sell_trx_id = urF.sell_trx_id AND urF.sell_trx_id = ANY(?)) group by sell_trx_id) min_ur on ur.sell_trx_id = min_ur.sell_trx_id AND ur.last_rental_payment = min_ur.min_date`;

            const neverConfirmedSellTxs = await knexInstance.raw(
                neverConfirmedSellTxsSql,
                [users_id, uniqConfirmedIds]
            );

            // throw new Error('checking the neverConfirmedSell difference');

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
            hiveRentalIds: uniqueHiveTxDates,
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
// hiveRentalIds should be an array of UNIQUE sell_trx_hive_ids
const getHiveTxDateObj = async ({ username, hiveRentalIds }) => {
    try {
        logger.debug(`/services/rentalConfirmation/getHiveTxDateObj`);

        const hiveTxDateObj = {};
        if (
            !hiveRentalIds ||
            !Array.isArray(hiveRentalIds) ||
            hiveRentalIds?.length < 1
        ) {
            logger.info(
                `/services/rentalConfirmation/getHiveTxDateObj: no sell_trx_hive_ids input for user: ${username}`
            );
            return null;
        }
        const hiveDatesForEachId = await HiveTxDate.query()
            .select('hive_tx_id', 'hive_created_at', 'id', 'confirmed')
            .whereIn('hive_tx_id', hiveRentalIds);

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
            logger.info(
                `rentalsWithSellIds: ${JSON.stringify(
                    rentalsWithSellIds
                )}, length: ${rentalsWithSellIds?.length}`
            );
        }
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
                } but HiveTxDate doesnt have these rows, rentalsWithSellIds: ${JSON.stringify(
                    rentalsWithSellIds
                )}`
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
