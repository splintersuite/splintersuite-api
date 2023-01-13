'use strict';
const UserRentals = require('../../models/UserRentals');
const logger = require('../../util/pinologger');

// TNT TODO:
// we need a function that looks through UserRentals, and finds those that have a sell_trx_hive_id as 'N' which is the default
// we need to replace that with the real sell_trx_hive_id

const updateSellTrxHiveIds = async () => {
    try {
        logger.debug(`/services/hive/cleanup/updateSellTrxHiveIds`);

        const badIds = await UserRentals.query()
            .select('sell_trx_id')
            .where('sell_trx_hive_id', 'N');
        const uniqueBadIds = await UserRentals.query()
            .select('sell_trx_id')
            .where('sell_trx_hive_id', 'N')
            .distinctOn('sell_trx_id');
        logger.info(
            `badIds: ${badIds?.length}, uniqueBadIds: ${uniqueBadIds.length}`
        );
        sortUniqueHiveSellIds({ sell_trx_ids: uniqueBadIds });
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
                    uniqueIds[sell_trx_hive_id] = sell_trx_hive_id;
                } else {
                    duplicateId = duplicateId + 1;
                }
            }
        }

        logger.info(
            `/services/hive/cleanup/sortUniqueHiveSellIds: sell_trx_ids: ${
                sell_trx_ids?.length
            } duplicates: ${duplicateId}, uniqueIds: ${
                Object.keys(uniqueIds).length
            }, check: ${
                sell_trx_ids?.length ===
                Object.keys(uniqueIds).length + duplicateId
            }`
        );
        const allUniqueIds = Object.keys(uniqueIds);
        return allUniqueIds;
    } catch (err) {
        logger.error(
            `/services/hive/cleanup/sortUniqueHiveSellIds error: ${err.message}`
        );
        throw err;
    }
};

module.exports = { updateSellTrxHiveIds };
