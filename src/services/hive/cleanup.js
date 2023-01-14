'use strict';
const UserRentals = require('../../models/UserRentals');
const logger = require('../../util/pinologger');
const _ = require('lodash');
// TNT NOTE: this is only to be run if we somehow have data that needs to be cleaned up

const updateSellTrxHiveIds = async () => {
    try {
        logger.debug(`/services/hive/cleanup/updateSellTrxHiveIds`);

        const uniqueBadIds = await UserRentals.query()
            .select('sell_trx_id')
            .where('sell_trx_hive_id', 'N')
            .distinctOn('sell_trx_id');

        logger.info(`uniqueBadIds: ${uniqueBadIds.length}`);
        const idsToBeInserted = sortUniqueHiveSellIds({
            sell_trx_ids: uniqueBadIds,
        });
        if (!idsToBeInserted) {
            logger.info(
                `/services/hive/cleanup/updateSellTrxHiveIds: nothing to insert`
            );
            return;
        }
        await insertHiveSellIds({ hiveIdsToBeInserted: idsToBeInserted });
        logger.info(`/services/hive/cleanup/updateSellTrxHiveIds:`);
        return;
    } catch (err) {
        logger.error(
            `/services/hive/cleanup/updateSellTrxHiveIds error: ${err.message}`
        );
        throw err;
    }
};

const sortUniqueHiveSellIds = ({ sell_trx_ids }) => {
    try {
        const uniqueIds = {};
        let duplicateId = 0;
        if (!Array.isArray(sell_trx_ids) || sell_trx_ids?.length < 1) {
            logger.warn(
                `/services/hive/cleanup/sortUniqueHiveSellIds sell_trx_ids is not an array with at least one entry, sell_trx_ids: ${JSON.stringify(
                    sell_trx_ids
                )}`
            );
            return null;
        }
        for (const { sell_trx_id } of sell_trx_ids) {
            let sell_trx_hive_id = 'N';
            const splits = sell_trx_id.split('-');
            if (Array.isArray(splits) && splits.length > 1) {
                sell_trx_hive_id = splits[0];
            }

            if (sell_trx_hive_id.length > 1) {
                if (!uniqueIds[sell_trx_hive_id]) {
                    const newArr = [];
                    newArr.push(sell_trx_id);
                    uniqueIds[sell_trx_hive_id] = newArr;
                } else {
                    duplicateId = duplicateId + 1;
                    uniqueIds[sell_trx_hive_id].push(sell_trx_id);
                }
            }
        }
        const allUniqueIds = Object.keys(uniqueIds);
        logger.info(
            `/services/hive/cleanup/sortUniqueHiveSellIds: sell_trx_ids: ${
                sell_trx_ids?.length
            } duplicates: ${duplicateId}, allUniqueIds: ${
                Object.keys(allUniqueIds).length
            }, check: ${
                sell_trx_ids?.length ===
                Object.keys(allUniqueIds).length + duplicateId
            }`
        );

        return uniqueIds;
    } catch (err) {
        logger.error(
            `/services/hive/cleanup/sortUniqueHiveSellIds error: ${err.message}`
        );
        throw err;
    }
};

const insertHiveSellIds = async ({ hiveIdsToBeInserted }) => {
    try {
        logger.debug(`/services/hive/cleanup/insertHiveSellIds`);
        let inserted = 0;

        for (const [sell_trx_hive_id, sell_trx_id_arr] of Object.entries(
            hiveIdsToBeInserted
        )) {
            const res = await UserRentals.query()
                .where('sell_trx_hive_id', 'N')
                .whereIn('sell_trx_id', sell_trx_id_arr)
                .patch({ sell_trx_hive_id: sell_trx_hive_id });
            inserted = inserted + res;
        }
        logger.info(
            `/services/hive/cleanup/insertHiveSellIds: inserted: ${inserted}`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/hive/cleanup/insertHiveSellIds error: ${err.message}`
        );
        throw err;
    }
};
module.exports = { updateSellTrxHiveIds };
