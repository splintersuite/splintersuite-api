const marketService = require('../services/market');
const logger = require('../util/pinologger');

const handleGetCurrentPrices = async (req, res, next) => {
    logger.debug(`controllers/handleCurrentPrices`);
    const currentPrices = await marketService.getCurrentPrices();
    res.send(currentPrices);
};

module.exports = {
    handleGetCurrentPrices,
};
