import UserRentals from '../../models/UserRentals';
import MarketRentalPrices from '../../models/MarketRentalPrices';

const ALL_OPEN_TRADES = 'ALL_OPEN_TRADES';
const TRADES_DURING_PERIOD = 'TRADES_DURING_PERIOD';

const dateRange = (startDate, endDate, steps = 1) => {
    const dateArray = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
        dateArray.push(new Date(currentDate));
        // Use UTC date to prevent problems with time zones and DST
        currentDate.setUTCDate(currentDate.getUTCDate() + steps);
    }

    return dateArray;
};

const getMarketRatesAndUserRentals = async ({ users_id }) => {
    const today = new Date();
    const firstOfLastMonth = new Date();
    firstOfLastMonth.setDate(1);
    firstOfLastMonth.setMonth(firstOfLastMonth.getMonth() - 1);
    firstOfLastMonth.setHours(0, 0, 0, 0);

    const userRentals = UserRentals.query()
        .where({ users_id })
        .whereBetween('period_start_time', [firstOfLastMonth, today]);

    const userRentalsObj = {};
    const uniqueCards = {};
    const uniqueLevels = [];
    userRentals.forEach((rental) => {
        if (!(rental.card_detail_id in uniqueCards)) {
            uniqueCards[rental.card_detail_id] = [];
            userRentalsObj[rental.card_detail_id] = {};
        }
        if (!(level in uniqueCards[rental.card_detail_id])) {
            uniqueCards[rental.card_detail_id].push(level);
        }
        if (!(level in uniqueLevels)) {
            uniqueLevels.push(level);
        }
        const levelKey = `level-${price.level}-${price.is_gold}`;
        if (!(levelKey in userRentalsObj[rental.card_detail_id][levelKey])) {
            userRentalsObj[rental.card_detail_id][levelKey] = {};
        }

        for (const day of dateRange(rental.rented_at, rental.cancelled_at)) {
            let timeKey;
            if (rental.rental_date.getHours() > 12) {
                day.setDate(day.getDate() + 1);
            }
            timeKey = day.toISOString().split('T')[0];
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
        if (!(cardKey in prices)) {
            pricesObj[cardKey] = {};
        }
        const levelKey = `level-${price.level}-${price.is_gold}`;
        if (!(levelKey in prices[cardKey])) {
            pricesObj[cardKey][levelKey] = {};
        }
        const datetime = price.period_start_time;
        let timeKey;
        if (datetime.getHours() > 12) {
            datetime.setDate(datetime.getDate() + 1);
            timeKey = datetime.toISOString().split('T')[0];
        } else {
            timeKey = datetime.toISOString().split('T')[0];
        }
        pricesObj[cardKey][levelKey][timeKey][price.aggregation_type] = {
            avg: price.avg,
            low: price.low,
            high: price.high,
            std: price.std_dev,
        };
    });

    return { userRentalsObj, pricesObj, firstOfLastMonth, today };
};

const performance = async ({ users_id }) => {
    const { userRentalsObj, pricesObj, firstOfLastMonth, today } =
        await getMarketRatesAndUserRentals({
            users_id,
        });

    // compare rental price vs pricesObj.avg for a daily rate...
    const byDay = {};
    for (const day of dateRange(firstOfLastMonth, today)) {
        const dayKey = day.toISOString().split('T')[0];
        byDay[dayKey] = {};
        byDay[dayKey][ALL_OPEN_TRADES] = [];
        byDay[dayKey][TRADES_DURING_PERIOD] = [];
        Object.keys(userRentalsObj).forEach((card_detail_id) => {
            Object.keys(userRentalsObj[card_detail_id]).forEach((levelKey) => {
                if (
                    Array.isArray(
                        userRentalsObj[card_detail_id][levelKey][dayKey]
                    ) &&
                    userRentalsObj[card_detail_id][levelKey][dayKey].length > 0
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
                                diff:
                                    rentalPrice /
                                    pricesObj[card_detail_id][levelKey][dayKey][
                                        ALL_OPEN_TRADES
                                    ],
                                marketAvg:
                                    pricesObj[card_detail_id][levelKey][dayKey][
                                        ALL_OPEN_TRADES
                                    ],
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
                                diff:
                                    rentalPrice /
                                    pricesObj[card_detail_id][levelKey][dayKey][
                                        TRADES_DURING_PERIOD
                                    ],
                                marketAvg:
                                    pricesObj[card_detail_id][levelKey][dayKey][
                                        TRADES_DURING_PERIOD
                                    ],
                            });
                        });
                    }
                }
            });
        });
    }

    const rentalsVsAllOpenTrades = [];
    const rentalsVsCurrentTrades = [];
    byDay[day].forEach((aggType) => {
        if (aggType === ALL_OPEN_TRADES) {
            rentalsVsAllOpenTrades.push({
                date: new Date(day),
                pctDiff: _.mean(byDay[day][aggType].map(({ diff }) => diff)),
                marketAvg: byDay[day][aggType][0],
            });
        }
        if (aggType === TRADES_DURING_PERIOD) {
            rentalsVsCurrentTrades.push({
                date: new Date(day),
                pctDiff: _.mean(byDay[day][aggType].map(({ diff }) => diff)),
                marketAvg: byDay[day][aggType][0],
            });
        }
    });
    return { rentalsVsAllOpenTrades, rentalsVsCurrentTrades };
};

export default { getMarketRates };
