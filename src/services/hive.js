const { Client } = require('@hiveio/dhive');
const logger = require('../util/pinologger');

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
            logger.info(
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

module.exports = {
    getHiveTransaction,
};
