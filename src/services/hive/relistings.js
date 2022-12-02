const { Client } = require('@hiveio/dhive');
const { json } = require('body-parser');
const logger = require('../../util/pinologger');
const splinterlandsService = require('../splinterlands');
const retryFncs = require('../../util/axios_retry/general');
const _ = require('lodash');

// https://gitlab.syncad.com/hive/dhive/-/blob/master/src/client.ts
const client = new Client(
    [
        'https://anyx.io',
        'https://api.hive.blog',
        'https://api.hivekings.com',
        'https://api.openhive.network',
    ],
    //{ timeout: 0, failoverThreshold: 0, consoleOnFailover: true } . this should retry forever but doesn't work for some reason, seems like the timeout doesn't get called properly when its an RC issue
    { timeout: 300000, failoverThreshold: 4, consoleOnFailover: true }
);

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

const getTransactionHiveIDsByUser = async ({ username, timeToStopAt }) => {
    try {
        logger.debug(`/services/hive/relistings/getTransactionHiveIDsByUser`);
        // last 1000 transactions... about 3 weeks for tamecards

        const recentSplintersuiteHiveIDs = [];
        const recentUserHiveIDs = [];
        const tooOld = [];
        const ids = [];
        let startingRecord = -1;
        let breakOut = false;
        let finalLoop = false;
        let lastRecord;
        const startingRecords = [];

        for (let i = 0; i < 100; i++) {
            logger.info(
                `/services/hive/relistings/getTransactionHiveIDsByUser for user: ${username}, startingRecord: ${startingRecord}, iteration: ${i}`
            );
            const data = await client.database.getAccountHistory(
                username,
                startingRecord,
                1000
                //  operation_filter_low: 262144,
            );
            if (Array.isArray(data) && data.length > 0) {
                data.reverse(); // goes from oldest to newest now
                for (const record of data) {
                    if (tooOld?.length > 0) {
                        finalLoop = true;
                    }
                    /*
                record[0] is the current block (so if we want to start at it, instead of -1 we'd put in this block number)
                record: [4186,{\"trx_id\":\"9b7b3309cec012fe02730c87fab990c45c68cae4\",\"block\":69643929,\"trx_in_block\":36,\"op_in_trx\":0,\"virtual_op\":false,\"timestamp\":\"2022-11-14T03:35:18\",\"op\":[\"custom_json\",{\"required_auths\":[],\"required_posting_auths\":[\"xdww\"],\"id\":\"sm_update_rental_price\",\"json\":\"{\\\"items\\\":[[\\\"4630ca6872af0204e7f117129c06c9cfd2098533-4\\\",13.05513],[\\\"dd998bc29079abcab71de53f195f9ea55942e0da-54\\\",145.2065],[\\\"402e0f1e42a75d7a890ba33d50602973c1d003e8-0\\\",33],[\\\"dd998bc29079abcab71de53f195f9ea55942e0da-55\\\",7.042],[\\\"a0ea371597d66713f4febbad5b84901edcff3d5e-1\\\",15]],\\\"agent\\\":\\\"splintersuite\\\",\\\"suite_action\\\":\\\"cancel\\\"}\"}]}]
                 */
                    const timestampz = record[1].timestamp + 'Z';
                    const timestampzDate = new Date(timestampz);
                    const timestampzTime = timestampzDate.getTime();

                    lastRecord = record;

                    ids.push(record[1].op[1].id);
                    if (
                        Array.isArray(record) &&
                        record.length > 1 &&
                        Array.isArray(record[1].op) &&
                        record[1].op.length > 1 &&
                        ['sm_update_rental_price', 'sm_market_list'].includes(
                            record[1].op[1].id
                        ) &&
                        typeof record[1].op[1].json === 'string'
                    ) {
                        // records are
                        let lookupKey;
                        if (record[1].op[1].id === 'sm_update_rental_price') {
                            lookupKey = 'items';
                        } else {
                            lookupKey = 'cards';
                        }
                        const records = JSON.parse(record[1].op[1].json);
                        if (
                            Array.isArray(records?.[lookupKey]) &&
                            records?.[lookupKey].length > 0
                        ) {
                            if (records?.agent === 'splintersuite') {
                                recentSplintersuiteHiveIDs.push({
                                    time: timestampzDate,
                                    IDs: [],
                                    isPriceUpdate: lookupKey === 'items',
                                    isSplintersuite: true,
                                    recordId: record[0],
                                });

                                records?.[lookupKey].forEach((rec) => {
                                    if (Array.isArray(rec)) {
                                        recentSplintersuiteHiveIDs[
                                            recentSplintersuiteHiveIDs.length -
                                                1
                                        ].IDs.push(rec[0]);
                                    } else if (typeof rec === 'string') {
                                        recentSplintersuiteHiveIDs[
                                            recentSplintersuiteHiveIDs.length -
                                                1
                                        ].IDs.push(rec);
                                    } else if (typeof rec === 'number') {
                                        // do nothing, don't want to add it into IDs cuz it isn't one
                                    } else {
                                        logger.error(
                                            `record is fuded, rec: ${JSON.stringify(
                                                rec
                                            )}`
                                        );
                                        throw new Error('checking the rec fud');
                                    }
                                });
                            } else {
                                recentUserHiveIDs.push({
                                    time: timestampzDate,
                                    IDs: [],
                                    isPriceUpdate: lookupKey === 'items',
                                    isSplintersuite: false,
                                    recordId: record[0],
                                });
                                records?.[lookupKey].forEach((rec) => {
                                    if (Array.isArray(rec)) {
                                        recentUserHiveIDs[
                                            recentUserHiveIDs.length - 1
                                        ].IDs.push(rec[0]);
                                    } else if (typeof rec === 'string') {
                                        recentUserHiveIDs[
                                            recentUserHiveIDs.length - 1
                                        ].IDs.push(rec);
                                    } else if (typeof rec === 'number') {
                                        // do nothing, don't want to add it into IDs cuz it isn't one
                                    } else {
                                        logger.error(
                                            `record is fuded, rec: ${JSON.stringify(
                                                rec
                                            )}`
                                        );
                                        throw new Error('checking the rec fud');
                                    }
                                });
                            }
                        }
                    }

                    if (
                        timestampzTime < timeToStopAt &&
                        ['sm_update_rental_price', 'sm_market_list'].includes(
                            record[1].op[1].id
                        )
                    ) {
                        tooOld.push(record);
                        if (finalLoop) {
                            breakOut = true;
                            break;
                        }
                    }
                }
            }
            startingRecords.push(startingRecord);
            startingRecord = parseInt(lastRecord[0]) - 1;
            if (startingRecord < 1000) {
                //  UnhandledPromiseRejectionWarning: RPCError: args.start >= args.limit-1: start must be greater than or equal to limit-1 (start is 0-based index)
                // we need our startingRecord to be greater than or equal to the limit, which is 1000 (the max value it can be)
                startingRecord = 1000;
            }
            if (breakOut) {
                break;
            }
            await retryFncs.sleep(10000);
        }
        // sorts ascending... it should already be but just in case...
        const recentHiveIDs = _.sortBy(
            _.concat(recentSplintersuiteHiveIDs, recentUserHiveIDs),
            'time'
        );

        logger.info(
            `/services/hive/relistings/getTransactionHiveIDsByUser: ${username}`
        );
        logger.info(
            `recentHiveIDs: ${recentHiveIDs?.length}, tooOld: ${
                tooOld?.length
            }, lastRecord[0]: ${JSON.stringify(lastRecord[0])}`
        );
        return recentHiveIDs;
    } catch (err) {
        logger.error(
            `/services/hive/relistings/getTransactionHiveIDsByUser error: ${err.message}`
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

        logger.info(`services/hive/getPostedSuiteRelistings:`);
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
            `/services/hive/relistings/getRecentHiveRelistings: for ${username}`
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
            }, oldTransactions: ${oldTxs}, Check: ${
                oldTxs + Object.keys(listings)?.length === tx
            }`
        );
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
    getTransactionHiveIDsByUser,
};

// TNT NOTE: in our how to ultimately convert, we have from our active rentals endpoint https://api2.splinterlands.com/market/active_rentals?owner=xdww
// sell_trx_id (which we can use to lookup the rentalListing shit), then we also have to match the rental_tx, next_rental_payment, payment_amount, and card_id (which is the uid of the card)

// we can have our listings end up being able to convert into a card_uid and then have a map of uids to their current sell_trx_id, so we can ultimately just confirm if true
// and any that match our listings from the hive endpoint on it, we can then obviously mark as ok cuz we made the initial rental as well, actually initial rental id isn't there, so if there is any that aren't confirmed, we can confirm with these
// (TNT NOTE: this means that we also do want to capture splintersuite and non splintersuite data for all of this, cuz then users can manually do shit and we wouldn't know)

// TNT SELF THOUGHT: Not only do we want to keep the user hive actions rather than filter out, we also want to save every single change in a searchable object with the search key being for relistings the sell_trx_id, uid
// we have the splintersuite ones, and as long as we have the same sell_trx_id and card uid, then we are good for as many rentals between the non splintersuite actions that are done on the sell_trx_id and/or the uid of the card

// we missing the rental_tx from the hive stuff, and we don't have exactly the next_rental_payment_time, but we can see the timeline

/*
{"level":40,"time":"2022-11-16T14:07:15.007Z","pid":10232,"hostname":"Trevors-Mac-mini.local","msg":"record: [2461,{\"trx_id\":\"03f88a3bdd4a3b53ecb0097ad4341168bc36bc34\",\"block\":67045407,\"trx_in_block\":56,\"op_in_trx\":0,\"virtual_op\":false,\"timestamp\":\"2022-08-15T17:25:27\"
{"level":40,"time":"2022-11-16T14:07:15.007Z","pid":10232,"hostname":"Trevors-Mac-mini.local","msg":"lastRecord: [2462,{\"trx_id\":\"a4bc4ea5a57224f8245a371784753d80cf47fb8e\",\"block\":67045408,\"trx_in_block\":8,\"op_in_trx\":0,\"virtual_op\":false,\"timestamp\":\"2022-08-15T17:25:30\",\"op\":[\"custom_json\",{\"required_auths\":[],\"required_posting_auths\":[\"xdww\"],\"id\":\"sm_update_rental_price\",\"json\":\"{\\\"items\\\":[[\\\"3f5ae14af7380928907fd6558411c40ca43debd5-2\\\",114.513],[\\\"78305c574e9e763e32099c2bd212f7f61eb83f1b-9\\\",\\\"29.658\\\"],[\\\"c459a32c445c117510b06eb9e5905e61d79ac740-4\\\",\\\"6.7\\\"]],\\\"agent\\\":\\\"splintersuite\\\",\\\"required_posting_auths\\\":[\\\"xdww\\\"],\\\"required_auths\\\":[]}\"}]}]"}
{"level":40,"time":"2022-11-16T14:07:15.007Z","pid":10232,"hostname":"Trevors-Mac-mini.local","msg":"timetoStopAt: 1660584330000, new Date(timetoStopAt) : Mon Aug 15 2022 13:25:30 GMT-0400 (Eastern Daylight Time)"}

*/
