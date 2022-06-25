const marketService = require('../services/market');

const handleGetCurrentPrices = async (req, res, next) => {
    const currentPrices = await marketService.getCurrentPrices();
    res.send(currentPrices);
};

module.exports = {
    handleGetCurrentPrices,
};
