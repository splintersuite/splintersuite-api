const marketService = require('../services/market');
const logger = require('../util/pinologger');

const handleGetCurrentPrices = async (req, res, next) => {
    logger.debug(`controllers/handleCurrentPrices`);
    const currentPrices = await marketService.getCurrentPrices();
    logger.debug(
        `/controllers/market/handleGetCurrentPrices done with currentPrices.length: ${currentPrices?.length}`
    );
    logger.debug(
        `the keys to currentPrices: ${JSON.stringify(
            Object.keys(currentPrices)
        )}`
    );
    res.send(currentPrices);
};

module.exports = {
    handleGetCurrentPrices,
};
