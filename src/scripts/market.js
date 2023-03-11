const cardsDetails = require('../util/cardDetails.json');
const retryFncs = require('../util/axios_retry/general');
const logger = require('../util/pinologger');
const marketService = require('../services/market');

// TNT TODO: actually insert the data into our db
const getHistoricalData = async () => {
    try {
        logger.info(`/scripts/rentals/getHistoricalData start`);
        // runs at 05:00 EST
        // runs at 17:00 EST
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const twelveHoursAgoTime = twelveHoursAgo.getTime();

        const fiveMinutesInMS = 1000 * 60 * 5;
        let count = 0;
        for (const card of cardsDetails) {
            if (card?.edition === 6) {
                logger.info(
                    `/scripts/rentals/getHistoricalData card: ${card?.name} is Gladius`
                );
            } else if (card?.edition === 10) {
                logger.info(
                    `/scripts/rentals/getHistoricalData card: ${card?.name} is Soulbound Reward`
                );
            } else {
                await marketService.collectData({
                    card,
                    now,
                    twelveHoursAgo,
                    twelveHoursAgoTime,
                });

                if (count !== 0 && count % 100 === 0) {
                    logger.info(
                        '/scripts/rentals/getHistoricalData sleep 5 mins'
                    );
                    await retryFncs.sleep(fiveMinutesInMS);
                }
                count++;
            }
        }
        logger.info('/scripts/rentals/getHistoricalData');
        process.exit(0);
    } catch (err) {
        logger.error(`getHistoricalData error: ${err.message}`);
        throw err;
    }
};

getHistoricalData();
