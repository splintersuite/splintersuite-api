'use-strict';
const logger = require('../../util/pinologger');
const { CURRENT_PRICES } = require('./types');
const { client } = require('./client');

const cacheCurrentPrices = async ({ currentPrices, timeOfLastFetch }) => {
    logger.debug(
        '/services/cacher/currentPricesCacher/cacheCurrentPrices done'
    );
    await client.set(
        CURRENT_PRICES,
        JSON.stringify({
            timeCached: new Date().getTime(),
            currentPrices,
            timeOfLastFetch,
        })
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
    if (
        data?.timeCached > twelveHoursAgo &&
        data?.currentPrices &&
        data?.timeOfLastFetch &&
        Number.isFinite(data?.timeOfLastFetch)
    ) {
        logger.debug(
            `/services/cacher/currentPricesCacher/getCachedCurrentPrices done with currentPrices.length: ${
                Object.keys(data?.currentPrices)?.length
            }`
        );
        return {
            currentPrices: data.currentPrices,
            timeOfLastFetch: data.timeOfLastFetch,
        };
    }
    logger.info(
        `/services/cacher/currentPricesCacher/getCachedCurrentPrices No Viable Cache`
    );
    return { currentPrices: null };
};

module.exports = {
    cacheCurrentPrices,
    getCachedCurrentPrices,
};
