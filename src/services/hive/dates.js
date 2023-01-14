'use strict';
const logger = require('../../util/pinologger');
const retryFncs = require('../../util/axios_retry/general');
const UserRentals = require('../../models/UserRentals');
const HiveTxDate = require(`../../models/HiveTxDate`);
const knexInstance = require('../../../db/index');
const relistingsService = require('./relistings');
const _ = require('lodash');
const updateHiveTxDates = async () => {
    try {
        logger.debug(`/services/hive/dates/updateHiveTxDates`);
        // first get all the HiveTxDates in existence, get all the unique HiveTxDates
        // we need to get all of the distinct hiveTxIds from UserRentals
        // and then see which ones don't exist in already in hiveTxDate, once we have this
        // we then need to insert the hiveTxIds that aren't in the table, and then look up the ones that don't have a hive_created_at not null
        const distinctHiveIds = await UserRentals.query()
            //.select('sell_trx_hive_id') // this makes it so we only get the sell_trx_hive_id back
            .distinct('sell_trx_hive_id')
            .debug();

        // https://stackoverflow.com/questions/4076098/how-to-select-rows-with-no-matching-entry-in-another-table
        // make SQL query that is like this

        // then once we have all of these IDs, we need to actually insert the non new ones into the hive_tx_date table
        // once this is done, we can then query this table for all of the ones that have a hive_created_at of null,
        // and update that shit

        // THEN WE CAN CHANGE OUR rentalConfirmation shit to also include recording and updating all of the unique hive_trx_ids

        // TNT TODO: we also need a function to go over the userRentals and get them their sell_tx
        logger.info(
            ` count: ${distinctHiveIds?.length}, firstRow: ${JSON.stringify(
                distinctHiveIds[0]
            )}`
        );
        await getAndInsertNewHiveTxDates();
        return;
    } catch (err) {
        logger.error(
            `/services/hive/dates/updateHiveTxDates error: ${err.message}`
        );
        throw err;
    }
};

const getAndInsertNewHiveTxDates = async () => {
    try {
        logger.debug(`/services/hive/dates/getAndInsertNewHiveTxDates`);
        const notInsertedHiveTxIdsSql = `SELECT distinct ur.sell_trx_hive_id FROM user_rentals ur WHERE NOT EXISTS (SELECT hd.hive_tx_id FROM hive_tx_date hd WHERE ur.sell_trx_hive_id = hd.hive_tx_id)`;
        const unique_sell_hive_ids = await knexInstance.raw(
            notInsertedHiveTxIdsSql
        );
        logger.info(
            `res of the raw is: ${JSON.stringify(
                Object.keys(unique_sell_hive_ids)
            )}, unique_sell_hive_ids: ${JSON.stringify(
                unique_sell_hive_ids?.rows?.length
            )} `
        );
        logger.info(
            `res of raw[0] is: ${JSON.stringify(unique_sell_hive_ids.rows[0])}`
        );
        // logger.info(
        //     `res of the raw is: ${JSON.stringify(unique_sell_hive_ids)}`
        // );

        const txsWithDateToInsert = await getCreatedDatesForIds({
            sell_trx_hive_ids: unique_sell_hive_ids.rows,
        });

        await insertHiveTxDates({ dateObjArr: txsWithDateToInsert });

        return;
    } catch (err) {
        logger.error(
            `/services/hive/dates/getAndInsertNewHiveTxDates error: ${err.message}`
        );
        throw err;
    }
};

const insertHiveTxDates = async ({ dateObjArr }) => {
    try {
        logger.debug(`/services/hive/dates/insertHiveTxDates`);

        if (
            !dateObjArr ||
            !Array.isArray(dateObjArr) ||
            dateObjArr?.length === 0
        ) {
            logger.info(
                `/services/hive/dates/insertHiveTxDates: no new hive txs to insert`
            );
            return null;
        }

        let chunks = dateObjArr;
        if (dateObjArr?.length > 1000) {
            chunks = _.chunk(dateObjArr, 1000);
        }

        if (chunks.length === dateObjArr.length) {
            chunks = [chunks];
        }
        for (const dateChunk of chunks) {
            await HiveTxDate.query().insert(dateChunk);
        }

        logger.info(
            `/services/hive/dates/insertHiveTxDates: inserted: ${dateObjArr.length}`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/hive/dates/insertHiveTxDates error: ${err.message}`
        );
        throw err;
    }
};

const getCreatedDatesForIds = async ({ sell_trx_hive_ids }) => {
    try {
        logger.debug(`/services/hive/dates/getCreatedDatesForIds`);
        const createdDatesForIds = [];
        for (const { sell_trx_hive_id } of sell_trx_hive_ids) {
            logger.info(
                `/services/hive/dates/getCreatedDatesForIds sell_trx_hive_id: ${JSON.stringify(
                    sell_trx_hive_id
                )}`
            );
            const { hive_created_at_date } =
                await relistingsService.getHiveTransactionDate({
                    transactionId: sell_trx_hive_id,
                });

            const hiveTxDateObj = {
                hive_tx_id: sell_trx_hive_id,
                hive_created_at: hive_created_at_date,
            };
            createdDatesForIds.push(hiveTxDateObj);
        }
        logger.info(
            `/services/hive/dates/getCreatedDatesForIds: ${createdDatesForIds?.length}`
        );
        return createdDatesForIds;
    } catch (err) {
        logger.error(
            `/services/hive/dates/getCreatedDatesForIds error: ${err.message}`
        );
        throw err;
    }
};

module.exports = { updateHiveTxDates };
