const histFncs = require('../src/services/marketData/historicalData');
const cardFncs = require('../src/actions/getCardDetails');
const retryFncs = require('../src/services/axios_retry/general');

const getHistoricalData = async () => {
    // runs at 05:00 EST
    // runs at 17:00 EST
    const cardsDetails = await cardFncs.getCardDetail();
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twelveHoursAgoTime = twelveHoursAgo.getTime();

    const fiveMinutesInMS = 1000 * 60 * 5;
    let count = 0;
    for (const card of cardsDetails) {
        await histFncs.collectData({
            card,
            now,
            twelveHoursAgo,
            twelveHoursAgoTime,
        });
        if (count !== 0 && count % 100 === 0) {
            await retryFncs.sleep(fiveMinutesInMS);
        }
        count++;
    }
};

// getHistoricalData();

const historicalFetchMorning = '* 5 * * *';
const historicalFetchEvening = '* 17 * * *';

const historicalFetchOptions = {
    scheduled: true,
    timezone: 'America/New_York',
};

module.exports = {
    getHistoricalData,
    historicalFetchMorning,
    historicalFetchEvening,
    historicalFetchOptions,
};
