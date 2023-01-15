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
const knexInstance = require('../../db/index');
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

        const rentalsToConfirm = await UserRentals.query().where({
            users_id,
            confirmed: null,
        });

        if (!Array.isArray(rentalsToConfirm) || rentalsToConfirm?.length < 1) {
            logger.warn(
                `user: ${username}, don't have any saved userRentals that arent confirmed`
            );
            return;
        }
        // const sellTrxIds = _.uniq(
        //     rentalsToConfirm.map(({ sell_trx_id }) => sell_trx_id)
        // );

        const rentalsConfirmed = await UserRentals.query()
            .where({
                users_id,
            })
            .whereNotNull('confirmed')
            .whereIn('sell_trx_id', sellTrxIds);
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

        const recentConfirmedRentals = getMostRecentConfirmedRentals({
            rentalsConfirmed,
        });
        logger.info(
            `recentConfirmedRentals: ${JSON.stringify(recentConfirmedRentals)}`
        );
        // throw new Error('checking for new function output');
        if (recentConfirmedRentals) {
            // if they have any, then xd
        } else {
            // if not, then we need to do old way
        }
        // const marketIdsFromCollection =
        //     await splinterlandsService.marketIdsForCollection({
        //         username,
        //     });

        // const sellTransactionIds = _.uniq(
        //     rentalsToConfirm.map(({ sell_trx_id }) => sell_trx_id)
        // );
        // TNT NOTE:
        // WE want to be able to only need to look far back enough, we want to essentially be able to
        // only go back to the sell_trx_ids that we DONT have one confirmed for
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/patchRentalsBySplintersuite error: ${err.message}`
        );
        throw err;
    }
};

const getEarliestDateNeeded = ({
    recentRentalsConfirmed,
    rentalsToConfirm,
}) => {
    try {
        logger.debug(`/services/rentalConfirmation/getEarliestDateNeeded`);

        if (
            !recentRentalsConfirmed ||
            !Array.isArray(recentRentalsConfirmed) ||
            recentRentalsConfirmed?.length < 1
        ) {
            // TNT NOTE: THIS IS TOTALLY FINE AND A OK!
            const earliestDateTime = getEarliestRentalCreatedDate({
                rentals: rentalsToConfirm,
            });
            logger.info(
                `/services/rentalConfirmation/getEarliestDateNeeded: no confirmed rentals: ${earliestDateTime}`
            );
            return earliestDateTime;
            // const allTxDates = [];
            // we don't have any rentals confirmed, we need to go with our old method of getting the earliest created_at date
            // for (const ucRental of rentalsToConfirm) {
            //     const { created_at } = ucRental;
            //     const created_at_time = new Date(created_at).getTime();
            //     allDates.push(created_at_time);
            //     const earliestDateTime = _.min(allTxDates);
            //     logger.info(
            //         `there was no recent rentals to confirm, therefore we just took the earliest date from created_at, earliestDateTime: ${earliestDateTime}`
            //     );
            //     return earliestDateTime;
            // }
        } else {
            // we have rentals confirmed, we need to go and first find if there are any of these IDs that are missing from sellTrxIdsToConfirm
            // we then need to determine if there are, the earliest date FROM an array of:
            // 1) market_created_date for the nonmatched sellTrxIds, AND 2) the last_rental_payment of all the ones that matched
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getEarliestDateNeeded error: ${err.message}`
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
// market_created_date comes from the collection which is what we need to ultimately get, need to first filter out which Ids we need to look up, and then create the market collection Ids filter imo
const getSearchableRentalsBySellTrxId = ({ rentals }) => {
    try {
        logger.debug(
            `services/rentalConfirmation/getSearchableRentalsBySellTrxId`
        );

        const searachableObj = {};

        for (const rental of rentals) {
            const { sell_trx_id } = rental;
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getSearchableRentalsBySellTrxId error: ${err.message}`
        );
        throw err;
    }
};

const getEarliestRentalCreatedDate = ({ rentals }) => {
    try {
        logger.debug(
            `/services/rentalConfirmation/getEarliestRentalCreatedDate`
        );

        const allCreatedDateTimes = [];

        for (const rental of rentals) {
            const { created_at } = rental;
            const created_at_time = new Date(created_at).getTime();
            allCreatedDates.push(created_at_time);
        }

        const earliestDateTime = _.min(allCreatedDateTimes);

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
// TNT TODO: IF WE RETURN NULL FROM THIS, THEN WE USE THE OLD METHOD THAT IS SUPER BEAT/LONG
const getMostRecentConfirmedRentals = ({ rentalsConfirmed }) => {
    try {
        logger.debug(
            `/services/rentalConfirmation/getMostRecentConfirmedRentals`
        );

        const recentConfirmedBySellId = {};
        let oldTime = 0;
        let replaced = 0;
        if (!Array.isArray(rentalsConfirmed) || rentalsConfirmed?.length < 1) {
            logger.info(
                `/services/rentalConfirmation/getMostRecentConfirmedRentals no confirmed rentals`
            );
            return null;
        }

        for (const rental of rentalsConfirmed) {
            const { last_rental_payment, sell_trx_id } = rental;
            logger.info(`last_rental_payment: ${last_rental_payment}`);
            const last_rental_payment_time = new Date(
                last_rental_payment
            ).getTime();
            const priorRentalForSellId = recentConfirmedBySellId[sell_trx_id];
            if (priorRentalForSellId) {
                // we have at least one prior entry
                if (
                    priorRentalForSellId?.last_rental_payment_time >
                    last_rental_payment_time
                ) {
                    // then the current rental payment is actually farther back in time than the one in our object, therefore is useless
                    oldTime = oldTime + 1;
                    continue;
                } else {
                    replaced = replaced + 1;
                    recentConfirmedBySellId[sell_trx_id] = {
                        last_rental_payment_time,
                        sell_trx_id,
                    };
                }
            } else {
                recentConfirmedBySellId[sell_trx_id] = {
                    last_rental_payment_time,
                    sell_trx_id,
                };
            }
        }

        logger.info(
            `/services/rentalConfirmation/getMostRecentConfirmedRentals: oldTime: ${oldTime}, replaced: ${replaced}, rentalsConfirmed: ${
                rentalsConfirmed?.length
            }, recentConfirmed: ${
                Object.keys(recentConfirmedBySellId).length
            }, check: ${
                rentalsConfirmed?.length ===
                oldTime + replaced + Object.keys(recentConfirmedBySellId).length
            }`
        );
        return recentConfirmedBySellId;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getMostRecentConfirmedRentals error: ${err.message}`
        );
        throw err;
    }
};

const getEarliestMarketId = ({
    marketIdsFromCollection,
    sellTransactionIds,
}) => {
    try {
        logger.info(`/services/rentalConfirmation/getEarliestMarketId`);
        const txDates = [];
        let noTxFound = 0;
        for (const sellTxId of sellTransactionIds) {
            const sellTxInfo = marketIdsFromCollection[sellTxId];
            // is this userRental a part of the current collection listing?
            if (sellTxInfo) {
            }
        }
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/getEarliestMarketId error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    confirmRentalsForUsers,
    patchRentalsBySplintersuite,
};

// TNT TODO: we can actually just end up looking at the created_at dates for these hive transactions, and then add that to the userRentals db, so that we can ultimately get them all at the same created_at dates, rather than have to rely on them being in the collection IMO
