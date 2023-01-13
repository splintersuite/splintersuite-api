'use strict';
const logger = require('../../util/pinologger');
const retryFncs = require('../../util/axios_retry/general');
const UserRentals = require('../../models/UserRentals');
const HiveTxDate = require(`../../models/HiveTxDate`);

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

        //.toKnexQuery(); // this makes it so we don't get any duplicates
        //  .distinct();

        // logger.info(
        //     `distinctHiveIds: ${JSON.stringify(distinctHiveIds)}, count: ${
        //         distinctHiveIds?.length
        //     }`
        // );
        logger.info(
            ` count: ${distinctHiveIds?.length}, firstRow: ${JSON.stringify(
                distinctHiveIds[0]
            )}`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/hive/dates/updateHiveTxDates error: ${err.message}`
        );
        throw err;
    }
};

module.exports = { updateHiveTxDates };
