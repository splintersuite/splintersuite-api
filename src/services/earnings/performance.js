import UserRentals from '../../models/UserRentals';
import MarketRentalPrices from '../../models/MarketRentalPrices';
import { dateRange } from '../../util/dates';
import _ from 'lodash';

const ALL_OPEN_TRADES = 'ALL_OPEN_TRADES';
const TRADES_DURING_PERIOD = 'TRADES_DURING_PERIOD';

const getMarketRatesAndUserRentals = async ({ users_id }) => {
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
        pricesObj[cardKey][levelKey][timeKey][price.aggregaton_type] = {
            avg: price.avg,
            low: price.low,
            high: price.high,
            std: price.std_dev,
        };
    });

    return { userRentalsObj, pricesObj, firstOfLastMonth, today };
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

performanceVsMarket({ users_id: '5eadd15a-b7d1-4fe5-a636-f4fa5d42c447' });

export default { getMarketRatesAndUserRentals, performanceVsMarket };
