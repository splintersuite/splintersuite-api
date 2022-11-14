'use strict';

const logger = require('../../util/pinologger');
const hiveService = require('../../services/hive/relistings');

const testHiveRelistings = async () => {
    try {
        logger.debug(`/scripts/tests/hive/testHiveRelistings start`);

        const username = 'xdww';

        await hiveService.getTransactionHiveIDsByUser({ username });

        logger.info(`/scripts/tests/hive/testHiveRelistings done`);
        return;
    } catch (err) {
        logger.error(
            `/scripts/tests/hive/testHiveRelistings error: ${err.message}`
        );
        throw err;
    }
};

testHiveRelistings();
