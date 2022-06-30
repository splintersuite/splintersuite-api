const _ = require('lodash');
const logger = require('../util/pinologger');
const DailyEarnings = require('../models/DailyEarnings');
const UserRentals = require('../models/UserRentals');
const { SPLINTERSUITE_BOT } = require('./rentals/types');
const { firstDayOfWeek, getLastWeek } = require('../util/dates');
const { orderBy } = require('lodash');

// ---
// Calculate aggregated earnings
// --------------------
const get = async ({ users_id }) => {
    logger.debug('/services/earnings/get');
    const now = new Date();
    const firstOfTheWeek = firstDayOfWeek(now, 0);
    const firstOfTheMonth = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-01`
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let todaysEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [yesterday, now])
        .orderBy('created_at', 'desc');
    const wtdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [firstOfTheWeek, now]);
    const mtdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('earnings_date', [firstOfTheMonth, now]);
    // get rid of yesterday if it's there
    if (Array.isArray(todaysEarnings) && todaysEarnings.length > 1) {
        todaysEarnings = [todaysEarnings[0]];
    }

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

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

const calcDailyEarnings = async ({ users_id }) => {
    try {
        logger.debug(`/services/earnings/calcDailyEarnings`);
        // const rentals = await UserRentals.query().where({
        //     users_id,
        //     is_rental_active: true,
        // });

        const rentals = await UserRentals.query()
            .where('user_rentals.users_id', users_id)
            .where('user_rentals.is_rental_active', true)
            .join(
                'user_rental_listings',
                'user_rentals.user_rental_listing_id',
                'user_rental_listings.id'
            )
            .select('user_rentals.*', 'user_rental_listings.source');

        const botRentals = rentals.filter(
            ({ source }) => source === SPLINTERSUITE_BOT
        );
        logger.info('calcDailyEarnings done');
        return {
            bot_num_rentals: botRentals.length,
            bot_earnings_dec: _.sum(botRentals.map(({ price }) => price)),
            num_rentals: rentals.length,
            earnings_dec: _.sum(rentals.map(({ price }) => price)),
        };
    } catch (err) {
        logger.error(`calcDailyEarnings error: ${err.message}`);
        throw err;
    }
};

// NEEDS TO BE RUN ON A DAILY BASIS
const insertDailyEarnings = async ({ users_id, earnings_date }) => {
    try {
        logger.debug(`/services/earnings/insertDailyEarnings`);
        const earningsData = await calcDailyEarnings({ users_id });

        const earningsDate = new Date(earnings_date);
        const [record] = await DailyEarnings.query().where({
            users_id,
            earnings_date: earningsDate,
        });

        if (!record) {
            await DailyEarnings.query().insert({
                users_id,
                earnings_date: earningsDate,
                earnings_dec: earningsData.earnings_dec,
                num_rentals: earningsData.num_rentals,
                bot_earnings_dec: earningsData.bot_earnings_dec,
                bot_num_rentals: earningsData.bot_num_rentals,
            });
        } else {
            await DailyEarnings.query().where({ id: record.id }).patch({
                earnings_dec: earningsData.earnings_dec,
                num_rentals: earningsData.num_rentals,
                bot_earnings_dec: earningsData.bot_earnings_dec,
                bot_num_rentals: earningsData.bot_num_rentals,
            });
        }

        logger.info('insertDailyEarnings done');
        return;
    } catch (err) {
        logger.error(`insertDailyEarnings error: ${err.message}`);
        throw err;
    }
};

module.exports = { get, calcDailyEarnings, insertDailyEarnings };

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
