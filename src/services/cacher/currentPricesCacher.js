'use-strict';
const logger = require('../../util/pinologger');
const { CURRENT_PRICES } = require('./types');
const { client } = require('./client');

const cacheCurrentPrices = async ({ currentPrices }) => {
    logger.debug(
        '/services/cacher/currentPricesCacher/cacheCurrentPrices done'
    );
    await client.set(
        CURRENT_PRICES,
        JSON.stringify({ timeCached: new Date().getTime(), currentPrices })
    );
    // expire in 12 hours
    await client.expire(CURRENT_PRICES, 60 * 60 * 12);
    logger.debug(
        '/services/cacher/currentPricesCacher/cacheCurrentPrices done'
    );
    return;
};

const getCachedCurrentPrices = async () => {
    const _data = await client.get(CURRENT_PRICES);
    const data = JSON.parse(_data);

    const twelveHoursAgo = new Date(
        new Date().getTime() - 1000 * 60 * 60 * 12
    ).getTime();
    if (data?.timeCached > twelveHoursAgo && data?.currentPrices) {
        return data.currentPrices;
    }
    return null;
};

module.exports = {
    cacheCurrentPrices,
    getCachedCurrentPrices,
};
