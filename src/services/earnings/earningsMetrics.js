const DailyEarnings = require('../../models/DailyEarnings');
const { firstDayOfWeek, getLastWeek } = require('../../util/dates');
const _ = require('lodash');

const calcAggregatedEarnings = async ({ users_id }) => {
    const now = new Date();
    const firstOfTheWeek = firstDayOfWeek(now, 0);
    const firstOfTheMonth = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-01`
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const todaysEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [yesterday, now]);
    const wtdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [firstOfTheWeek, now]);
    const mtdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [firstOfTheMonth, now]);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);

    const firstOfLastWeek = firstDayOfWeek(getLastWeek(), 0);
    const sameDayLastWeek = new Date(firstOfLastWeek);
    sameDayLastWeek.setDate(sameDayLastWeek.getDate() + now.getDay());

    const firstOfLastMonth = new Date();
    firstOfLastMonth.setDate(1);
    firstOfLastMonth.setMonth(firstOfLastMonth.getMonth() - 1);
    firstOfLastMonth.setHours(0, 0, 0, 0);
    const sameDayLastMonth = new Date(firstOfLastMonth);
    sameDayLastMonth.setDate(sameDayLastMonth.getDate() + now.getDate());

    const lastYdayEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [twoDaysAgo, yesterday]);
    const lastWtdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [firstOfLastWeek, sameDayLastWeek]);
    const lastMtdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [firstOfLastMonth, sameDayLastMonth]);

    const weeklyEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [sameDayLastMonth, now]);

    const totalEarned = await DailyEarnings.query().where({ users_id });

    return {
        bot: {
            daily: {
                amount: _.sum(
                    todaysEarnings.map(
                        ({ bot_earnings_dec }) => bot_earnings_dec
                    )
                ),
                // dec_today / dec_yday - 1
                change:
                    _.sum(
                        todaysEarnings.map(
                            ({ bot_earnings_dec }) => bot_earnings_dec
                        )
                    ) /
                        _.sum(
                            lastYdayEarnings.map(
                                ({ bot_earnings_dec }) => bot_earnings_dec
                            )
                        ) -
                    1,
            },
            wtd: {
                amount: _.sum(
                    wtdEarnings.map(({ bot_earnings_dec }) => bot_earnings_dec)
                ),
                // dec_today / dec_yday - 1
                change:
                    _.sum(
                        wtdEarnings.map(
                            ({ bot_earnings_dec }) => bot_earnings_dec
                        )
                    ) /
                        _.sum(
                            lastWtdEarnings.map(
                                ({ bot_earnings_dec }) => bot_earnings_dec
                            )
                        ) -
                    1,
            },
            mtd: {
                amount: _.sum(
                    mtdEarnings.map(({ bot_earnings_dec }) => bot_earnings_dec)
                ),
                // dec_today / dec_yday - 1
                change:
                    _.sum(
                        mtdEarnings.map(
                            ({ bot_earnings_dec }) => bot_earnings_dec
                        )
                    ) /
                        _.sum(
                            lastMtdEarnings.map(
                                ({ bot_earnings_dec }) => bot_earnings_dec
                            )
                        ) -
                    1,
            },
            weekly: weeklyEarnings.map(
                ({ bot_earnings_dec, earnings_date }) => ({
                    earnings: bot_earnings_dec,
                    date: earnings_date,
                })
            ),
            totalEarned: totalEarned.map(
                ({ bot_earnings_dec }) => bot_earnings_dec
            ),
        },
        total: {
            daily: {
                amount: _.sum(
                    todaysEarnings.map(({ earnings_dec }) => earnings_dec)
                ),
                // dec_today / dec_yday - 1
                change:
                    _.sum(
                        todaysEarnings.map(({ earnings_dec }) => earnings_dec)
                    ) /
                        _.sum(
                            lastYdayEarnings.map(
                                ({ earnings_dec }) => earnings_dec
                            )
                        ) -
                    1,
            },
            wtd: {
                amount: _.sum(
                    wtdEarnings.map(({ earnings_dec }) => earnings_dec)
                ),
                // dec_today / dec_yday - 1
                change:
                    _.sum(wtdEarnings.map(({ earnings_dec }) => earnings_dec)) /
                        _.sum(
                            lastWtdEarnings.map(
                                ({ earnings_dec }) => earnings_dec
                            )
                        ) -
                    1,
            },
            mtd: {
                amount: _.sum(
                    mtdEarnings.map(({ earnings_dec }) => earnings_dec)
                ),
                // dec_today / dec_yday - 1
                change:
                    _.sum(mtdEarnings.map(({ earnings_dec }) => earnings_dec)) /
                        _.sum(
                            lastMtdEarnings.map(
                                ({ earnings_dec }) => earnings_dec
                            )
                        ) -
                    1,
            },
            weekly: weeklyEarnings.map(({ earnings_dec, earnings_date }) => ({
                earnings: earnings_dec,
                date: earnings_date,
            })),
            totalEarned: totalEarned.map(({ earnings_dec }) => earnings_dec),
        },
    };
};

module.exports = { calcAggregatedEarnings };

// user.stats = {
//     daily: {
//         amount: 324,
//         change: -0.0345,
//     },
//     weekly: {
//         amount: 3124,
//         change: 0.1045,
//     },
//     monthly: {
//         amount: 30124,
//         change: 0.1245,
//     },
// };

// weekly: [10, 31, 22, 35, 10, 2, 45];

// totalEarned: 6969;
