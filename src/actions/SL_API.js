const axiosInstance = require('../util/axiosInstance');
const logger = require('../util/pinologger');

const getSplinterlandsSettings = async () => {
    try {
        logger.debug('getSplinterlandsSettings start');

        const url = 'https://api2.splinterlands.com/settings';

        const res = await axiosInstance(url);

        const data = res.data;

        return data;
    } catch (err) {
        logger.error(`getSplinterlandsSettings error: ${err.message}`);
        throw err;
    }
};

module.exports = { getSplinterlandsSettings };
