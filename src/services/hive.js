const { Client } = require('@hiveio/dhive');
const { json } = require('body-parser');
const logger = require('../util/pinologger');
const splinterlandsService = require('./splinterlands');

const client = new Client([
    'https://api.hive.blog',
    'https://api.hivekings.com',
    'https://anyx.io',
    'https://api.openhive.network',
]);

const getHiveTransaction = async ({ transactionId }) => {
    try {
        logger.debug(`/services/hive/getHiveTransaction`);
        const data = await client.database.getTransaction(transactionId);
        if (
            Array.isArray(data?.operations) &&
            data.operations.length === 1 &&
            Array.isArray(data.operations[0]) &&
            data.operations[0].length > 1 &&
            data.operations[0][1]['json'] !== undefined
        ) {
            logger.debug(`/services/hive/getHiveTransaction done with data`);
            logger.debug(
                `/services/hive/getHiveTransaction data: ${JSON.stringify(
                    data.operations[0][1].json
                )}`
            );
            return JSON.parse(data.operations[0][1].json);
        }
        logger.debug(`/services/hive/getHiveTransaction done with null`);
        return null;
    } catch (err) {
        logger.error(`/services/hive/getHiveTransaction error: ${err.message}`);
        if (err?.jse_info?.code === 10) {
            return null;
        }
        throw err;
    }
};

const successfullyPosted = ({ hiveTransaction }) => {
    try {
        logger.debug(`/services/hive/successfullyPosted`);
        if (hiveTransaction?.success) {
            if (hiveTransaction?.error) {
                logger.error(
                    `/services/hive/successfullyPosted we have a hive transaction with successs being true, but an error : ${hiveTransaction?.error}, hiveTransaction: ${hiveTransaction}`
                );
            }
            return true;
        } else {
            return false;
        }
    } catch (err) {
        logger.error(`/services/hive/successfullyPosted error: ${err.message}`);
        throw err;
    }
};

const isSplintersuite = ({ hiveTransaction }) => {
    try {
        logger.debug(`/services/hive/isSplintersuite`);
        const data = hiveTransaction?.data;
        const jsonData = JSON.parse(data);
        if (jsonData && jsonData?.agent === 'splintersuite') {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        logger.error(`/services/hive/isSplintersuite error: ${err.message}`);
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
            `/services/hive/getPostedSuiteRelistings error: ${err.message}`
        );
        throw err;
    }
};

const getRecentHiveRelistings = async ({ username, lastCreatedTime }) => {
    try {
        logger.debug(`/services/hive/getRecentHiveRelistings start`);
        const hiveTxs = [];
        let notOurs = 0;
        let notSuccess = 0;
        const hiveTransactions = await splinterlandsService.getHiveRelistings({
            username,
        });

        for (const transaction of hiveTransactions) {
            const { created_date } = transaction;
            const createdTime = new Date(created_date).getTime();
            const posted = successfullyPosted({ hiveTransaction: transaction });
            const isSuite = isSplintersuite({ hiveTransaction });
            if (!isSuite) {
                notOurs = notOurs + 1;
                continue;
            }
            if (!posted) {
                notSuccess = notSuccess + 1;
                continue;
            }
            if (lastCreatedTime <= createdTime) {
                hiveTxs.push(transaction);
            }
        }
        logger.info(`/services/hive/getRecentHiveRelistings for ${username}`);
        logger.info(
            `lastCreatedTime: ${lastCreatedTime}, notOurs: ${notOurs}, notSuccess: ${notSuccess}, hiveTransactions: ${hiveTransactions?.length}, hiveTxs: ${hiveTxs?.length}`
        );
        return hiveTxs;
    } catch (err) {
        logger.error(
            `/services/hive/getRecentHiveRelistings error: ${err.message}`
        );
        throw err;
    }
};

const getRelistingType = ({ transactions }) => {
    try {
        logger.debug(`/services/hive/getRelistingType`);

        const hiveListingsObj = buildHiveListingsObj({ transactions });
        const { relist, cancel } = seperateByListingType({ hiveListingsObj });

        logger.info(`/services/hive/getRelistingType:`);
        return { relist, cancel };
    } catch (err) {
        logger.error(`/services/hive/getRelistingType error: ${err.message}`);
        throw err;
    }
};

const seperateByListingType = ({ hiveListingsObj }) => {
    try {
        logger.debug(`/services/hive/seperateByListingType`);
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
            `/services/hive/seperateByListingType: Relistings: ${
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
            `/services/hive/seperateByListingType error: ${err.message}`
        );
        throw err;
    }
};

const buildHiveListingsObj = ({ transactions }) => {
    try {
        logger.debug(`/services/hive/buildHiveListingsObj start`);
        const listings = {};
        const oldTxs = 0;
        let tx = 0;

        if (transactions?.length < 1) {
            logger.warn(
                `/services/hive/buildHiveListingsObj input transactions has a length less than 1, transactions: ${JSON.stringify(
                    transactions
                )}`
            );
        }

        for (const transaction of transactions) {
            const data = transaction?.data;
            const jsonData = JSON.parse(data);
            if (!jsonData) {
                logger.warn(
                    `/services/hive/buildHiveListingsObj transaction doesnt have any data element to it, transaction: ${JSON.stringify(
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

        logger.info(`/services/hive/buildHiveListingsObj:`);
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
            `/services/hive/buildHiveListingsObj error: ${err.message}`
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
};

// TNT NOTE: in our how to ultimately convert, we have from our active rentals endpoint https://api2.splinterlands.com/market/active_rentals?owner=xdww
// sell_trx_id (which we can use to lookup the rentalListing shit), then we also have to match the rental_tx, next_rental_payment, payment_amount, and card_id (which is the uid of the card)
