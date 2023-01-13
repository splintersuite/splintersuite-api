'use strict';
const logger = require('../util/pinologger');
const hiveCleanup = require('../services/hive/cleanup');

const cleanupHiveTxs = async () => {
    try {
        logger.info(`/scripts/hiveCleanup/cleanupHiveTxs`);
        await hiveCleanup.updateSellTrxHiveIds();
        logger.info(`/scripts/hiveCleanup/cleanupHiveTxs:`);
        process.exit(0);
    } catch (err) {
        logger.error(
            `/scripts/hiveCleanup/cleanupHiveTxs error: ${err.message}`
        );
        throw err;
    }
};

cleanupHiveTxs();
