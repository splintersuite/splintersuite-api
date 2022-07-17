const cardsDetails = require('../util/cardDetails.json');
const retryFncs = require('../util/axios_retry/general');
const logger = require('../util/pinologger');
const marketService = require('../services/market');

// TNT TODO: actually insert the data into our db
const getHistoricalData = async () => {
    try {
        logger.debug(`/scripts/rentals/getHistoricalData`);
        // runs at 05:00 EST
        // runs at 17:00 EST
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const twelveHoursAgoTime = twelveHoursAgo.getTime();

        const fiveMinutesInMS = 1000 * 60 * 5;
        let count = 0;
        for (const card of cardsDetails) {
            await marketService.collectData({
                card,
                now,
                twelveHoursAgo,
                twelveHoursAgoTime,
            });
            if (count !== 0 && count % 100 === 0) {
                logger.debug('sleeping 5 mins');
                await retryFncs.sleep(fiveMinutesInMS);
            }
            count++;
        }
        logger.debug('getHistoricalData done');
        process.exit(0);
    } catch (err) {
        logger.error(`getHistoricalData error: ${err.message}`);
        throw err;
    }
};

getHistoricalData();
