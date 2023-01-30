const cardsDetails = require('../util/cardDetails.json');
const retryFncs = require('../util/axios_retry/general');
const logger = require('../util/pinologger');
const marketService = require('../services/market');
const utilDates = require(`../util/dates`);

// TNT TODO: actually insert the data into our db
const getHistoricalData = async () => {
    try {
        logger.info(`/scripts/rentals/getHistoricalData`);
        // runs at 05:00 EST
        // runs at 17:00 EST
        const now = new Date();
        const startTime = now.getTime();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const twelveHoursAgoTime = twelveHoursAgo.getTime();

        const fiveMinutesInMS = 1000 * 60 * 5;
        let count = 0;
        for (const card of cardsDetails) {
            if (card?.edition === 6) {
                logger.info(
                    `/scripts/rentals/getHistoricalData card: ${card?.name} is Gladius`
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
        const end = new Date();
        const endTime = end.getTime();
        const totalMinsLong = utilDates.computeMinsSinceStart({
            startTime,
            endTime,
        });
        logger.info(
            `/scripts/rentals/getHistoricalData: totalMinsLong: ${totalMinsLong}`
        );
        process.exit(0);
    } catch (err) {
        logger.error(`getHistoricalData error: ${err.message}`);
        throw err;
    }
};

getHistoricalData();
