const _ = require('lodash');

const logger = require('../util/pinologger');
const UserRentals = require('../models/UserRentals');
const MarketRentalPrices = require('../models/MarketRentalPrices');
const { dateRange } = require('../util/dates');
const axiosInstance = require('../util/axiosInstance');
const findCardLevel = require('../util/calculateCardLevel');
const mathFncs = require('../util/math');
const { getCachedCurrentPrices, cacheCurrentPrices } = require('./cacher');
const splinterlandsService = require('./splinterlands');

const ALL_OPEN_TRADES = 'ALL_OPEN_TRADES';
const TRADES_DURING_PERIOD = 'TRADES_DURING_PERIOD';

// ---
// from services/earnings/performance.js
// -----------------
const getMarketRatesAndUserRentals = async ({ users_id }) => {
    logger.debug(`/services/market/getMarketRatesAndUserRentals`);
    const today = new Date();
    const firstOfLastMonth = new Date();
    firstOfLastMonth.setDate(1);
    firstOfLastMonth.setMonth(firstOfLastMonth.getMonth() - 1);
    firstOfLastMonth.setHours(0, 0, 0, 0);

    const userRentals = await UserRentals.query()
        .where('user_rentals.users_id', users_id)
        .whereBetween('rented_at', [firstOfLastMonth, today])
        .join(
            'user_rental_listings',
            'user_rentals.user_rental_listing_id',
            'user_rental_listings.id'
        )
        .select(
            'user_rentals.*',
            'user_rental_listings.is_gold',
            'user_rental_listings.level',
            'user_rental_listings.card_detail_id'
        );

    const userRentalsObj = {};
    const uniqueCards = {};
    const uniqueLevels = [];
    userRentals.forEach((rental) => {
        if (!(rental.card_detail_id in uniqueCards)) {
            uniqueCards[rental.card_detail_id] = [];
            userRentalsObj[rental.card_detail_id] = {};
        }
        if (!(rental.level in uniqueCards[rental.card_detail_id])) {
            uniqueCards[rental.card_detail_id].push(rental.level);
        }
        if (!uniqueLevels.includes(rental.level)) {
            uniqueLevels.push(rental.level);
        }

        const levelKey = `level-${rental.level}-${rental.is_gold}`;
        if (!(levelKey in userRentalsObj[rental.card_detail_id])) {
            userRentalsObj[rental.card_detail_id][levelKey] = {};
        }

        for (const day of dateRange(rental.rented_at, rental.cancelled_at)) {
            if (rental.rented_at.getHours() > 12) {
                day.setDate(day.getDate() + 1);
            }
            const timeKey = day.toISOString().split('T')[0];
            if (!(timeKey in userRentalsObj[rental.card_detail_id][levelKey])) {
                userRentalsObj[rental.card_detail_id][levelKey][timeKey] = [];
            }
            userRentalsObj[rental.card_detail_id][levelKey][timeKey].push(
                rental.price
            );
        }
    });

    const prices = await MarketRentalPrices.query()
        .whereIn('card_detail_id', Object.keys(uniqueCards))
        .whereIn('level', uniqueLevels)
        .whereBetween('period_start_time', [firstOfLastMonth, today]);

    const pricesObj = {};
    prices.forEach((price) => {
        const cardKey = price.card_detail_id;
        if (!(cardKey in pricesObj)) {
            pricesObj[cardKey] = {};
        }
        const levelKey = `level-${price.level}-${price.is_gold}`;
        if (!(levelKey in pricesObj[cardKey])) {
            pricesObj[cardKey][levelKey] = {};
        }
        const datetime = price.period_start_time;
        if (datetime.getHours() > 12) {
            datetime.setDate(datetime.getDate() + 1);
        }
        const timeKey = datetime.toISOString().split('T')[0];
        pricesObj[cardKey][levelKey][timeKey] = {};
        pricesObj[cardKey][levelKey][timeKey][price.aggregation_type] = {
            avg: price.avg,
            low: price.low,
            high: price.high,
            std: price.std_dev,
        };
    });

    return { userRentalsObj, pricesObj, firstOfLastMonth, today };
};

const getCurrentPrices = async () => {
    logger.debug(`/services/market/getCurrentPrices`);
    const cachedPriceData = await getCachedCurrentPrices();

    if (
        cachedPriceData?.currentPrices != null &&
        Object.keys(cachedPriceData?.currentPrices)?.length > 100 &&
        Number.isFinite(cachedPriceData?.timeOfLastFetch)
    ) {
        logger.info(
            `/services/market/getCurrentPrices cached price points: ${
                Object.keys(cachedPriceData?.currentPrices)?.length
            }`
        );
        return {
            currentPrices: cachedPriceData.currentPrices,
            timeOfLastFetch: cachedPriceData.timeOfLastFetch,
        };
    }

    const twentySixHoursAgo = new Date(
        new Date().getTime() - 1000 * 60 * 60 * 26
    );

    const prices = await MarketRentalPrices.query()
        .whereBetween('period_start_time', [twentySixHoursAgo, new Date()])
        .orderBy('period_start_time', 'desc');

    const pricesObj = {};
    const timeOfLastFetch = new Date(
        _.max(prices.map(({ period_end_time }) => period_end_time))
    ).getTime();
    prices.forEach((price) => {
        const keyString = `${price.card_detail_id}-${price.level}-${price.is_gold}-${price.edition}`;
        if (!(keyString in pricesObj)) {
            pricesObj[keyString] = {};
        }
        if (!(price.aggregation_type in pricesObj[keyString])) {
            pricesObj[keyString][price.aggregation_type] = {
                avg: price.avg,
                low: price.low,
                high: price.high,
                stdDev: price.std_dev,
                median: price.median,
                volume: price.volume,
            };
        }
    });

    if (Object.keys(pricesObj).length === 0) {
        logger.error(
            `The market prices in our db for the time period: ${new Date(
                twentySixHoursAgo
            )} to now: ${new Date()} aren't populated!`
        );
    }
    await cacheCurrentPrices({ currentPrices: pricesObj, timeOfLastFetch });
    logger.info(
        `/services/market/getCurrentPrices db price points: ${
            Object.keys(pricesObj)?.length
        }`
    );
    return { currentPrices: pricesObj, timeOfLastFetch };
};

const performanceVsMarket = async ({ users_id }) => {
    const { userRentalsObj, pricesObj, firstOfLastMonth, today } =
        await getMarketRatesAndUserRentals({
            users_id,
        });

    // compare rental price vs pricesObj.avg for a daily rate...
    const byDay = {};
    const rentalsVsAllOpenTrades = [];
    const rentalsVsCurrentTrades = [];
    for (const day of dateRange(firstOfLastMonth, today)) {
        const dayKey = day.toISOString().split('T')[0];
        byDay[dayKey] = {};
        byDay[dayKey][ALL_OPEN_TRADES] = [];
        byDay[dayKey][TRADES_DURING_PERIOD] = [];
        Object.keys(userRentalsObj).forEach((card_detail_id) => {
            Object.keys(userRentalsObj[card_detail_id]).forEach((levelKey) => {
                if (
                    userRentalsObj[card_detail_id] &&
                    userRentalsObj[card_detail_id][levelKey] &&
                    Array.isArray(
                        userRentalsObj[card_detail_id][levelKey][dayKey]
                    ) &&
                    userRentalsObj[card_detail_id][levelKey][dayKey].length > 0
                ) {
                    if (
                        pricesObj[card_detail_id] &&
                        pricesObj[card_detail_id][levelKey] &&
                        pricesObj[card_detail_id][levelKey][dayKey]
                    ) {
                        if (
                            pricesObj[card_detail_id][levelKey][dayKey][
                                ALL_OPEN_TRADES
                            ]
                        ) {
                            userRentalsObj[card_detail_id][levelKey][
                                dayKey
                            ].forEach((rentalPrice) => {
                                byDay[day][ALL_OPEN_TRADES].push({
                                    rentalVsMarketRatio:
                                        rentalPrice /
                                        pricesObj[card_detail_id][levelKey][
                                            dayKey
                                        ][ALL_OPEN_TRADES],
                                    marketAvgDec:
                                        pricesObj[card_detail_id][levelKey][
                                            dayKey
                                        ][ALL_OPEN_TRADES],
                                });
                            });
                        }
                        if (
                            pricesObj[card_detail_id][levelKey][dayKey][
                                TRADES_DURING_PERIOD
                            ]
                        ) {
                            userRentalsObj[card_detail_id][levelKey][
                                dayKey
                            ].forEach((rentalPrice) => {
                                byDay[day][TRADES_DURING_PERIOD].push({
                                    rentalVsMarketRatio:
                                        rentalPrice /
                                        pricesObj[card_detail_id][levelKey][
                                            dayKey
                                        ][TRADES_DURING_PERIOD],
                                    marketAvgDec:
                                        pricesObj[card_detail_id][levelKey][
                                            dayKey
                                        ][TRADES_DURING_PERIOD],
                                });
                            });
                        }
                    }
                }
            });
        });

        // this DEC weighted average how your rentals compare to totalMarketDecYield
        // sample values for show and tell
        // rentalVsMarketRatio = 0.8, weighting 0.5 ( rental.marketAvgDec = 2, totalMarketDec = 4 )
        // rentalVsMarketRatio = 1.1, weighting 0.5
        // weightedAvgPctOfMarketYield = 0.95
        Object.keys(byDay[dayKey]).forEach((aggType) => {
            if (aggType === ALL_OPEN_TRADES) {
                const totalAvgMarketDecYield = _.sum(
                    byDay[dayKey][aggType].map(
                        ({ marketAvgDec }) => marketAvgDec
                    )
                );
                const weightedAvgPctOfMarketYield = _.sum(
                    byDay[dayKey][aggType].forEach((rental) => {
                        rental.rentalVsMarketRatio *
                            (rental.marketAvgDec / totalAvgMarketDecYield);
                    })
                );
                rentalsVsAllOpenTrades.push({
                    date: new Date(dayKey),
                    weightedAvgPctOfMarketYield,
                    totalAvgMarketDecYield,
                });
            }
            if (aggType === TRADES_DURING_PERIOD) {
                const totalAvgMarketDecYield = _.sum(
                    byDay[dayKey][aggType].map(
                        ({ marketAvgDec }) => marketAvgDec
                    )
                );
                const weightedAvgPctOfMarketYield = _.sum(
                    byDay[dayKey][aggType].forEach((rental) => {
                        rental.rentalVsMarketRatio *
                            (rental.marketAvgDec / totalAvgMarketDecYield);
                    })
                );
                rentalsVsCurrentTrades.push({
                    date: new Date(dayKey),
                    weightedAvgPctOfMarketYield,
                    totalAvgMarketDecYield,
                });
            }
        });
    }

    return { rentalsVsAllOpenTrades, rentalsVsCurrentTrades };
};

// performanceVsMarket({ users_id: '5eadd15a-b7d1-4fe5-a636-f4fa5d42c447' });

// ---
// from services/marketData/historicalData.js
// -----------------
const collectData = async ({
    card,
    now,
    twelveHoursAgo,
    twelveHoursAgoTime,
}) => {
    try {
        logger.debug(`/services/market/collectData`);

        let activeTrades = await splinterlandsService.getMarketInfoForCard({
            card_detail_id: card.id,
        });
        const trades = {};

        activeTrades.forEach((trade) => {
            const level = findCardLevel({
                id: card.id,
                rarity: card.rarity,
                _xp: trade.xp,
                gold: trade.gold,
                edition: trade.edition,
                tier: card.tier,
                alpha_xp: 0,
            });
            const levelEditionString = `level-${String(level)}-${String(
                trade.edition
            )}`;
            if (!(levelEditionString in trades)) {
                trades[levelEditionString] = {};
            }
            if (trade.gold && !('gold' in trades[levelEditionString])) {
                trades[levelEditionString]['gold'] = [];
            }

            if (!trade.gold && !('regular' in trades[levelEditionString])) {
                trades[levelEditionString]['regular'] = [];
            }

            const cardType = trade.gold ? 'gold' : 'regular';
            trades[levelEditionString][cardType].push({
                rentalId: trade.rental_tx,
                price: Number(trade.buy_price),
                feePct: Number(trade.fee_percent),
                paymentCurrency: trade.payment_currency,
                rentalDate: trade.rental_date,
                rentalDays: trade.rental_days,
                rentalType: trade.rental_type,
            });
        });
        activeTrades = [];
        // do math
        const uploadArr = [];
        for (const levelEditionKey of Object.keys(trades)) {
            for (const cardType of Object.keys(trades[levelEditionKey])) {
                // average of everything on loan...
                logger.info(
                    `about to start going through the trades[levelEditionKey][cardType]: ${JSON.stringify(
                        trades[levelEditionKey][cardType]
                    )}`
                );
                //throw new Error('checking');
                // TNT NOTE: we actually dont need to see the season rentals in the past 12 hours?
                const daily12HoursArr = [];
                const season12HoursArr = [];
                const dailyAllArr = [];
                const seasonAllArr = [];
                for (const cards of trades[levelEditionKey][cardType]) {
                    if (
                        new Date(trade.rentalDate).getTime() >
                        twelveHoursAgoTime
                    ) {
                        // we are in the most recent 12 hour stuff
                        if (cards?.rental_type === 'season') {
                            season12HoursArr.push(cards?.price);
                        } else {
                            daily12HoursArr.push(cards?.price);
                        }
                    } else {
                        // this is the whole past 48 hours it seems
                        if (cards?.rental_type === 'season') {
                            seasonAllArr.push(cards?.price);
                        } else {
                            dailyAllArr.push(cards?.price);
                        }
                    }
                }

                const seasonAll = createUploadElement({
                    cardTradesArr: seasonAllArr,
                });
                /*
                const stdDevSeasonAll =
                    mathFncs.standardDeviation(seasonAllArr);
                const medianSeasonAll = mathFncs.median(seasonAllArr);
                const meanSeasonAll = mathFncs.mean(seasonAllArr);
                const lowSeasonAll = mathFncs.min(seasonAllArr);
                const highSeasonAll = mathFncs.max(seasonAllArr);

                const stdDevSeason12 =
                    mathFncs.standardDeviation(season12HoursArr);
                const medianAllSeason12 = mathFncs.median(season12HoursArr);
                const meanAllSeason12 = mathFncs.mean(season12HoursArr);
                const lowAllSeason12 = mathFncs.min(season12HoursArr);
                const highAllSeason12 = mathFncs.max(season12HoursArr);

                const stdDevDailyAll = mathFncs.standardDeviation(dailyAllArr);
                const medianDailyAll = mathFncs.median(dailyAllArr);
                const meanDailyAll = mathFncs.mean(dailyAllArr);
                const lowDailyAll = mathFncs.min(dailyAllArr);
                const highDailyAll = mathFncs.max(dailyAllArr);

                const stdDevDaily12 =
                    mathFncs.standardDeviation(daily12HoursArr);
                const medianAllDaily12 = mathFncs.median(daily12HoursArr);
                const meanAllDaily12 = mathFncs.mean(daily12HoursArr);
                const lowAllDaily12 = mathFncs.min(daily12HoursArr);
                const highAllDaily12 = mathFncs.max(daily12HoursArr);
                */
                const twelveHoursArr = trades[levelEditionKey][cardType]
                    .filter((trade) => {
                        return (
                            new Date(trade.rentalDate).getTime() >
                            twelveHoursAgoTime
                        );
                    })
                    .map(({ price }) => price);
                const allArr = trades[levelEditionKey][cardType].map(
                    ({ price }) => price
                );
                const stdDevAll = mathFncs.standardDeviation(allArr);
                const medianAll = mathFncs.median(allArr);
                const meanAll = mathFncs.mean(allArr);
                const lowAll = mathFncs.min(allArr);
                const highAll = mathFncs.max(allArr);

                const stdDevTwelve = mathFncs.standardDeviation(twelveHoursArr);
                const medianTwelve = mathFncs.median(twelveHoursArr);
                const meanTwelve = mathFncs.mean(twelveHoursArr);
                const lowTwelve = mathFncs.min(twelveHoursArr);
                const highTwelve = mathFncs.max(twelveHoursArr);

                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(levelEditionKey.split('-')[1]),
                    edition: Number(levelEditionKey.split('-')[2]),
                    volume: Number.isFinite(allArr.length)
                        ? allArr.length
                        : NaN,
                    avg: Number.isFinite(meanAll) ? meanAll : NaN,
                    low: Number.isFinite(lowAll) ? lowAll : NaN,
                    high: Number.isFinite(highAll) ? highAll : NaN,
                    std_dev: Number.isFinite(stdDevAll) ? stdDevAll : NaN,
                    median: Number.isFinite(medianAll) ? medianAll : NaN,
                    is_gold: cardType === 'gold',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregation_type: ALL_OPEN_TRADES,
                    rental_type: 'ALL',
                });
                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(levelEditionKey.split('-')[1]),
                    edition: Number(levelEditionKey.split('-')[2]),
                    volume: Number.isFinite(twelveHoursArr.length)
                        ? twelveHoursArr.length
                        : NaN,
                    avg: Number.isFinite(meanTwelve) ? meanTwelve : NaN,
                    low: Number.isFinite(lowTwelve) ? lowTwelve : NaN,
                    high: Number.isFinite(highTwelve) ? highTwelve : NaN,
                    std_dev: Number.isFinite(stdDevTwelve) ? stdDevTwelve : NaN,
                    median: Number.isFinite(medianTwelve) ? medianTwelve : NaN,
                    is_gold: cardType === 'gold',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregation_type: TRADES_DURING_PERIOD,
                    rental_type: 'ALL',
                });

                // new stuff
                // seasonAll
                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(levelEditionKey.split('-')[1]),
                    edition: Number(levelEditionKey.split('-')[2]),
                    volume: Number.isFinite(seasonAllArr.length)
                        ? seasonAllArr.length
                        : NaN,
                    avg: Number.isFinite(meanSeasonAll) ? meanSeasonAll : NaN,
                    low: Number.isFinite(lowSeasonAll) ? lowSeasonAll : NaN,
                    high: Number.isFinite(highSeasonAll) ? highAll : NaN,
                    std_dev: Number.isFinite(stdDevAll) ? stdDevAll : NaN,
                    median: Number.isFinite(medianAll) ? medianAll : NaN,
                    is_gold: cardType === 'gold',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregation_type: ALL_OPEN_TRADES,
                    rental_type: 'ALL',
                });
                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(levelEditionKey.split('-')[1]),
                    edition: Number(levelEditionKey.split('-')[2]),
                    volume: Number.isFinite(allArr.length)
                        ? allArr.length
                        : NaN,
                    avg: Number.isFinite(meanAll) ? meanAll : NaN,
                    low: Number.isFinite(lowAll) ? lowAll : NaN,
                    high: Number.isFinite(highAll) ? highAll : NaN,
                    std_dev: Number.isFinite(stdDevAll) ? stdDevAll : NaN,
                    median: Number.isFinite(medianAll) ? medianAll : NaN,
                    is_gold: cardType === 'gold',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregation_type: ALL_OPEN_TRADES,
                    rental_type: 'ALL',
                });
                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(levelEditionKey.split('-')[1]),
                    edition: Number(levelEditionKey.split('-')[2]),
                    volume: Number.isFinite(allArr.length)
                        ? allArr.length
                        : NaN,
                    avg: Number.isFinite(meanAll) ? meanAll : NaN,
                    low: Number.isFinite(lowAll) ? lowAll : NaN,
                    high: Number.isFinite(highAll) ? highAll : NaN,
                    std_dev: Number.isFinite(stdDevAll) ? stdDevAll : NaN,
                    median: Number.isFinite(medianAll) ? medianAll : NaN,
                    is_gold: cardType === 'gold',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregation_type: ALL_OPEN_TRADES,
                    rental_type: 'ALL',
                });
                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(levelEditionKey.split('-')[1]),
                    edition: Number(levelEditionKey.split('-')[2]),
                    volume: Number.isFinite(allArr.length)
                        ? allArr.length
                        : NaN,
                    avg: Number.isFinite(meanAll) ? meanAll : NaN,
                    low: Number.isFinite(lowAll) ? lowAll : NaN,
                    high: Number.isFinite(highAll) ? highAll : NaN,
                    std_dev: Number.isFinite(stdDevAll) ? stdDevAll : NaN,
                    median: Number.isFinite(medianAll) ? medianAll : NaN,
                    is_gold: cardType === 'gold',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregation_type: ALL_OPEN_TRADES,
                    rental_type: 'ALL',
                });
            }
        }
        // upload to DB
        // rate limit this somehow
        if (uploadArr.length > 0) {
            await MarketRentalPrices.query().insert(uploadArr);
        } else {
            logger.error(
                `/services/market/collectData uploadArr has a length less than 0, uploadArr: ${JSON.stringify(
                    uploadArr
                )}`
            );
        }
        logger.info(
            `/services/market/collectData ID: ${card?.id}, Name: ${card?.name}`
        );
        return;
    } catch (err) {
        logger.error(`/services/market/collectData error: ${err.message}`);
        throw err;
    }
};

const createUploadElement = ({
    cardTradesArr,
    created_at,
    card_detail_id,
    level,
    edition,
    is_gold,
    price_currency,
    period_start_time,
    period_end_time,
    aggregation_type,
    rental_type,
}) => {
    try {
        logger.debug(`/services/market/createUploadElement`);

        const stdDevArr = mathFncs.standardDeviation(cardTradesArr);
        const medianArr = mathFncs.median(cardTradesArr);
        const meanArr = mathFncs.mean(cardTradesArr);
        const lowArr = mathFncs.min(cardTradesArr);
        const highArr = mathFncs.max(cardTradesArr);

        const elementToPush = {
            created_at,
            card_detail_id,
            level,
            eidition,
            volume: Number.isFinite(cardTradesArr?.length)
                ? cardTradesArr?.length
                : NaN,
            avg: Number.isFinite(meanArr) ? meanArr : NaN,
            low: Number.isFinite(lowArr) ? lowArr : NaN,
        };

        logger.debug(`/services/market/createUploadElement:`);
        // return { stdDevArr, medianArr, meanArr, lowArr, highArr };
    } catch (err) {
        logger.error(
            `/services/market/createUploadElement error: ${err.message}`
        );
        throw error;
    }
};

module.exports = {
    getMarketRatesAndUserRentals,
    performanceVsMarket,
    collectData,
    getCurrentPrices,
};
