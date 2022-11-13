const { Client } = require('@hiveio/dhive');
const { json } = require('body-parser');
const logger = require('../../util/pinologger');
const splinterlandsService = require('../splinterlands');
const _ = require('lodash');

const client = new Client([
    'https://api.hive.blog',
    'https://api.hivekings.com',
    'https://anyx.io',
    'https://api.openhive.network',
]);

const getHiveTransaction = async ({ transactionId }) => {
    try {
        logger.debug(`/services/hive/relistings/getHiveTransaction`);
        const data = await client.database.getTransaction(transactionId);
        if (
            Array.isArray(data?.operations) &&
            data.operations.length === 1 &&
            Array.isArray(data.operations[0]) &&
            data.operations[0].length > 1 &&
            data.operations[0][1]['json'] !== undefined
        ) {
            logger.debug(
                `/services/hive/relistings/getHiveTransaction done with data`
            );
            logger.debug(
                `/services/hive/relistings/getHiveTransaction data: ${JSON.stringify(
                    data.operations[0][1].json
                )}`
            );
            return JSON.parse(data.operations[0][1].json);
        }
        logger.debug(
            `/services/hive/relistings/getHiveTransaction done with null`
        );
        return null;
    } catch (err) {
        logger.error(
            `/services/hive/relistings/getHiveTransaction error: ${err.message}`
        );
        if (err?.jse_info?.code === 10) {
            return null;
        }
        throw err;
    }
};

const getSplintersuiteHiveIDs = async ({ username }) => {
    try {
        logger.debug(`/services/hive/relistings/getAccountHistory`);
        const data = await client.database.getAccountHistory(
            username,
            -1,
            1000
            // operation_filter_low: 262144,
        );
        let recentSplintersuiteHiveIDs = [];
        if (Array.isArray(data) && data.length > 0) {
            data.reverse(); // goes from oldest to newest now
            data.forEach((record) => {
                if (
                    Array.isArray(record) &&
                    record.length > 1 &&
                    Array.isArray(record[1].op) &&
                    record[1].op.length > 1 &&
                    [
                        'sm_update_rental_price',
                        'sm_market_list',
                        // 'sm_market_cancel_rental',
                    ].includes(record[1].op[1].id) &&
                    typeof record[1].op[1].json === 'string'
                ) {
                    recentSplintersuiteHiveIDs.push({
                        time: new Date(record[1].timestamp),
                        IDs: [],
                    });
                    const records = JSON.parse(record[1].op[1].json);
                    if (
                        records?.agent === 'splintersuite' &&
                        Array.isArray(records?.items)
                    ) {
                        records?.items.forEach((rec) => {
                            recentSplintersuiteHiveIDs[
                                recentSplintersuiteHiveIDs.length - 1
                            ].IDs.push(rec[0]);
                        });
                    }
                    // maybe some handling for the user manually listing and then removing it from the array?
                }
            });
        }

        return recentSplintersuiteHiveIDs.filter(
            (record) => record.IDs.length > 0
        );
    } catch (err) {
        logger.error(
            `/services/hive/relistings/getAccountHistory error: ${err.message}`
        );
        throw err;
    }
};

const successfullyPosted = ({ hiveTransaction }) => {
    try {
        logger.debug(`/services/hive/relistings/successfullyPosted`);
        if (hiveTransaction?.success) {
            if (hiveTransaction?.error) {
                logger.error(
                    `/services/hive/relistings/successfullyPosted we have a hive transaction with successs being true, but an error : ${hiveTransaction?.error}, hiveTransaction: ${hiveTransaction}`
                );
            }
            return true;
        } else {
            return false;
        }
    } catch (err) {
        logger.error(
            `/services/hive/relistings/successfullyPosted error: ${err.message}`
        );
        throw err;
    }
};

const isSplintersuite = ({ hiveTransaction }) => {
    try {
        logger.debug(`/services/hive/relistings/isSplintersuite`);
        const data = hiveTransaction?.data;
        const jsonData = JSON.parse(data);
        if (jsonData && jsonData?.agent === 'splintersuite') {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        logger.error(
            `/services/hive/relistings/isSplintersuite error: ${err.message}`
        );
        throw err;
    }
};

const getPostedSuiteRelistings = async ({ username, lastCreatedTime }) => {
    try {
        logger.debug(`services/hive/getPostedSuiteRelistings`);

        const relistings = await getRecentHiveRelistings({
            username,
            lastCreatedTime,
        });
        const { relist, cancel } = getRelistingType({
            transactions: relistings,
        });

        logger.info(`services/hive/getPostedSuiteRelistings`);
        return { relist, cancel };
    } catch (err) {
        logger.error(
            `/services/hive/relistings/getPostedSuiteRelistings error: ${err.message}`
        );
        throw err;
    }
};

const getRecentHiveRelistings = async ({ username, lastCreatedTime }) => {
    try {
        logger.debug(`/services/hive/relistings/getRecentHiveRelistings start`);
        const suiteHiveRelistings = [];
        const nonSuiteHiveRelistings = [];
        let notSuccess = 0;
        const hiveTransactions = await splinterlandsService.getHiveRelistings({
            username,
        });

        for (const transaction of hiveTransactions) {
            const { created_date } = transaction;
            const createdTime = new Date(created_date).getTime();
            const posted = successfullyPosted({ hiveTransaction: transaction });
            const isSuite = isSplintersuite({ hiveTransaction });
            if (!posted) {
                notSuccess = notSuccess + 1;
                continue;
            }
            if (!isSuite) {
                if (lastCreatedTime <= createdTime) {
                    nonSuiteHiveRelistings.push(transaction);
                }
                continue;
            }
            if (lastCreatedTime <= createdTime) {
                suiteHiveRelistings.push(transaction);
                continue;
            }
        }
        logger.info(
            `/services/hive/relistings/getRecentHiveRelistings for ${username}`
        );
        logger.info(
            `lastCreatedTime: ${lastCreatedTime}, nonSuiteHiveRelistings: ${nnonSuiteHiveRelistings}, notSuccess: ${notSuccess}, hiveTransactions: ${hiveTransactions?.length}, suiteHiveRelistings: ${suiteHiveRelistings?.length}`
        );
        return suiteHiveRelistings;
    } catch (err) {
        logger.error(
            `/services/hive/relistings/getRecentHiveRelistings error: ${err.message}`
        );
        throw err;
    }
};

const getRelistingType = ({ transactions }) => {
    try {
        logger.debug(`/services/hive/relistings/getRelistingType`);

        const hiveListingsObj = buildHiveListingsObj({ transactions });
        const { relist, cancel } = seperateByListingType({ hiveListingsObj });

        logger.info(`/services/hive/relistings/getRelistingType:`);
        return { relist, cancel };
    } catch (err) {
        logger.error(
            `/services/hive/relistings/getRelistingType error: ${err.message}`
        );
        throw err;
    }
};

const seperateByListingType = ({ hiveListingsObj }) => {
    try {
        logger.debug(`/services/hive/relistings/seperateByListingType`);
        const relist = {};
        const cancel = {};
        let none = 0;
        let listingCatch = 0;
        let total = 0;
        for (const [sell_trx_id, listing] of Object.entries(hiveListingsObj)) {
            // sell_trx_id: 439dff493cd95380cd6189b0a6e118e76149d1f4-0, listing: {"sell_trx_id":"439dff493cd95380cd6189b0a6e118e76149d1f4-0","buy_price":3.6187568,"created_time":1664225058000,"type":"c"}
            total = total + 1;
            const { type } = listing;
            if (type === 'rl') {
                relist[sell_trx_id] = listing;
            } else if (type === 'c') {
                cancel[sell_trx_id] = listing;
            } else if (type === 'n') {
                none = none + 1;
            } else {
                listingCatch = listingCatch + 1;
            }
        }
        logger.info(
            `/services/hive/relistings/seperateByListingType: Relistings: ${
                Object.keys(relist)?.length
            }, Cancelled: ${
                Object.keys(cancel)?.length
            }, No SS_Action: ${none}, Catch: ${listingCatch}, Check: ${
                total ===
                listingCatch +
                    none +
                    Object.keys(relist)?.length +
                    Object.keys(cancel)?.length
            }`
        );

        return { relist, cancel };
    } catch (err) {
        logger.error(
            `/services/hive/relistings/seperateByListingType error: ${err.message}`
        );
        throw err;
    }
};

const buildHiveListingsObj = ({ transactions }) => {
    try {
        logger.debug(`/services/hive/relistings/buildHiveListingsObj start`);
        const listings = {};
        const oldTxs = 0;
        let tx = 0;

        if (transactions?.length < 1) {
            logger.warn(
                `/services/hive/relistings/buildHiveListingsObj input transactions has a length less than 1, transactions: ${JSON.stringify(
                    transactions
                )}`
            );
        }

        for (const transaction of transactions) {
            const data = transaction?.data;
            const jsonData = JSON.parse(data);
            if (!jsonData) {
                logger.warn(
                    `/services/hive/relistings/buildHiveListingsObj transaction doesnt have any data element to it, transaction: ${JSON.stringify(
                        transaction
                    )}`
                );
                continue;
            }
            const items = jsonData?.items;
            const created_date = transaction?.created_date;
            let type;

            if (json?.suite_action === 'cancel') {
                type = 'c';
            } else if (jsonData?.suite_action === 'relist') {
                type = 'rl';
            } else {
                type = 'n';
            }
            const created_time = new Date(created_date).getTime();
            for (const item of items) {
                tx = tx + 1;
                const sell_trx_id = item[0];
                const buy_price = item[1];
                if (listings[sell_trx_id]) {
                    const existingTx = listings[sell_trx_id];
                    if (existingTx?.created_time < created_time) {
                        // this is a newer transaction, we need to replace our current one
                        listings[sell_trx_id] = {
                            sell_trx_id,
                            buy_price,
                            created_time,
                            type,
                        };
                    } else {
                        // this is an older transaction than the one we currently have
                        oldTxs = oldTxs + 1;
                    }
                    continue;
                } else {
                    // we don't have an existing sell_trx_id
                    listings[sell_trx_id] = {
                        sell_trx_id,
                        buy_price,
                        created_time,
                        type,
                    };
                }
            }
        }

        logger.info(`/services/hive/relistings/buildHiveListingsObj:`);
        logger.info(
            `Hive Transactions: ${
                transactions?.length
            }, Hive Listings: ${tx}, Latest Listings: ${
                Object.keys(listings)?.length
            }, oldTransactions: ${oldTxs}`
        );
        logger.info(`Check: ${oldTxs + Object.keys(listings)?.length === tx}`);
        return listings;
    } catch (err) {
        logger.error(
            `/services/hive/relistings/buildHiveListingsObj error: ${err.message}`
        );
        throw err;
    }
};
// we need uids for the arrays that are listings, sell_trx_id for relistings and relistActive
// TNT NOTE: we are building just the relistings and relistActive portion right now
// we can also go over listings to since we need to, but can also look up those ones individually if there aren't any matches here
module.exports = {
    getHiveTransaction,
    getPostedSuiteRelistings,
    getSplintersuiteHiveIDs,
};

// TNT NOTE: in our how to ultimately convert, we have from our active rentals endpoint https://api2.splinterlands.com/market/active_rentals?owner=xdww
// sell_trx_id (which we can use to lookup the rentalListing shit), then we also have to match the rental_tx, next_rental_payment, payment_amount, and card_id (which is the uid of the card)

// we can have our listings end up being able to convert into a card_uid and then have a map of uids to their current sell_trx_id, so we can ultimately just confirm if true
// and any that match our listings from the hive endpoint on it, we can then obviously mark as ok cuz we made the initial rental as well, actually initial rental id isn't there, so if there is any that aren't confirmed, we can confirm with these
// (TNT NOTE: this means that we also do want to capture splintersuite and non splintersuite data for all of this, cuz then users can manually do shit and we wouldn't know)

// TNT SELF THOUGHT: Not only do we want to keep the user hive actions rather than filter out, we also want to save every single change in a searchable object with the search key being for relistings the sell_trx_id, uid
// we have the splintersuite ones, and as long as we have the same sell_trx_id and card uid, then we are good for as many rentals between the non splintersuite actions that are done on the sell_trx_id and/or the uid of the card

// we missing the rental_tx from the hive stuff, and we don't have exactly the next_rental_payment_time, but we can see the timeline
