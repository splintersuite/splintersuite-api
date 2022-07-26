const { Client } = require('@hiveio/dhive');

const client = new Client([
    'https://api.hive.blog',
    'https://api.hivekings.com',
    'https://anyx.io',
    'https://api.openhive.network',
]);

const getHiveTransaction = async ({ transactionId }) => {
    try {
        const data = await client.database.getTransaction(transactionId);
        if (
            Array.isArray(data?.operations) &&
            data.operations.length === 1 &&
            Array.isArray(data.operations[0]) &&
            data.operations[0].length > 1 &&
            data.operations[0][1]['json'] !== undefined
        ) {
            return JSON.parse(data.operations[0][1].json);
        }
        return null;
    } catch (err) {
        if (err.jse_info.code === 10) {
            return null;
        }
        throw err;
    }
};

module.exports = {
    getHiveTransaction,
};
