import histFncs from '../services/marketData/historicalData.js';
import cardFncs from '../actions/getCardDetails';
import retryFncs from '../services/axios_retry/general';

const getHistoricalData = async () => {
    // runs at 05:00 EST
    // runs at 17:00 EST
    const cardsDetails = await cardFncs.getCardDetail();
    const now = new Date();

    const fiveMinutesInMS = 1000 * 60 * 5;
    const count = 0;
    for (const card of cardsDetails) {
        await histFncs.collectData(card, now);
        if (count % 100 === 0) {
            await retryFncs.sleep(fiveMinutesInMS);
        }
        count++;
    }
};

const historicalFetchMorning = '* 5 * * *';
const historicalFetchEvening = '* 17 * * *';

const historicalFetchOptions = {
    scheduled: true,
    timezone: 'America/New_York',
};

export default {
    getHistoricalData,
    historicalFetchMorning,
    historicalFetchEvening,
    historicalFetchOptions,
};
