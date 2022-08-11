const marketService = require('../services/market');
const logger = require('../util/pinologger');

const handleGetCurrentPrices = async (req, res, next) => {
    logger.debug(`controllers/handleCurrentPrices`);
    const currentPrices = await marketService.getCurrentPrices();
    logger.info(
        `/controllers/market/handleGetCurrentPrices done with currentPrices.currentPirces.length: ${
            Object.keys(currentPrices?.currentPrices)?.length
        }`
    );
    res.send(currentPrices);
};

module.exports = {
    handleGetCurrentPrices,
};
