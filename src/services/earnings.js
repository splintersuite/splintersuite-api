'use strict';
const logger = require('../util/pinologger');
const UserRentals = require('../models/UserRentals');
const utilDates = require('../util/dates');
const DailyEarnings = require('../models/DailyEarnings');
const { DateTime, Interval } = require('luxon');
const _ = require('lodash');

const get = async ({ users_id }) => {
    try {
        logger.debug('/services/earnings/get');

        const now = new Date();
        const one = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 1,
            date: now,
        });
        const seven = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 7,
            date: now,
        });
        const thirty = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 30,
            date: now,
        });

        const two = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 2,
            date: now,
        });

        const fourteen = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 14,
            date: now,
        });

        const sixty = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 60,
            date: now,
        });
        // TODO: change getEarningsForRange to get the dailyEarnings table shit
        const dailyEarnings = await getEarningsForRange({
            users_id,
            start_date: one.daysAgo,
            end_date: now,
        });

        const priorDailyEarnings = await getEarningsForRange({
            users_id,
            start_date: two.daysAgo,
            end_date: one.daysAgo,
        });

        const weeklyEarnings = await getEarningsForRange({
            users_id,
            start_date: seven.daysAgo,
            end_date: now,
        });

        const priorWeeklyEarnings = await getEarningsForRange({
            users_id,
            start_date: fourteen.daysAgo,
            end_date: seven.daysAgo,
        });
        logger.info(
            `before monthlyEarnings, start_date: ${JSON.stringify(
                thirty.daysAgo
            )}, end_date: ${JSON.stringify(now)}, users_id: ${users_id}`
        );

        const monthlyEarnings = await getEarningsForRange({
            users_id,
            start_date: thirty.daysAgo,
            end_date: now,
        });

        const priorMonthlyEarnings = await getEarningsForRange({
            users_id,
            start_date: sixty.daysAgo,
            end_date: thirty.daysAgo,
        });

        logger.info(
            `/services/earnings/get for users_id: ${users_id}, dailyEarnings: ${JSON.stringify(
                dailyEarnings
            )}, priorDailyEarnings: ${JSON.stringify(
                priorDailyEarnings
            )}, weeklyEarnings: ${JSON.stringify(
                weeklyEarnings
            )}, priorWeeklyEarnings: ${JSON.stringify(
                priorWeeklyEarnings
            )} monthlyEarnings: ${JSON.stringify(
                monthlyEarnings
            )}, priorMonthlyEarnings: ${JSON.stringify(priorMonthlyEarnings)}`
        );
        const daily = {
            amount: dailyEarnings.totalEarnings,
            change:
                dailyEarnings.totalEarnings / priorDailyEarnings.totalEarnings -
                1,
        };
        const wtd = {
            amount: weeklyEarnings.totalEarnings,
            change:
                weeklyEarnings.totalEarnings /
                    priorWeeklyEarnings.totalEarnings -
                1,
        };

        const mtd = {
            amount: monthlyEarnings.totalEarnings,
            change:
                monthlyEarnings.totalEarnings /
                    priorMonthlyEarnings.totalEarnings -
                1,
        };

        const rightNow = DateTime.utc();
        const startOfToday = utilDates.getStartOfDay({ date: rightNow });
        const pastSevenDays = startOfToday.minus({ days: 7 });

        const pastWeekDailyEarnings = await getDailyEarningsForDateRange({
            users_id,
            start_date: pastSevenDays,
            end_date: startOfToday,
        });

        const weekly = pastWeekDailyEarnings.map(
            ({ earnings_dec, earnings_date }) => ({
                earnings: earnings_dec,
                date: earnings_date,
            })
        );
        logger.debug(
            `pastWeekDailyEarnings : ${JSON.stringify(
                pastWeekDailyEarnings
            )}, length: ${pastWeekDailyEarnings.length},
            weekly: ${JSON.stringify(weekly)}`
        );
        logger.debug(
            `daily: ${JSON.stringify(daily)}, wtd: ${JSON.stringify(
                wtd
            )}, mtd: ${JSON.stringify(mtd)}`
        );
        const total = { daily, wtd, mtd, weekly };
        return { total };
    } catch (err) {
        logger.error(`/services/earnings/get error: ${err.message}`);
        throw err;
    }
};

const getEarningsForRange = async ({ users_id, start_date, end_date }) => {
    try {
        logger.debug('/services/earnings/getEarningsForRange');

        const activeRentals = await getActiveRentalsForRange({
            users_id,
            start_date,
            end_date,
        });

        /*
        // this is the last point in the array coming back from activeRentals
        {\"id\":\"60351aa1-7bc7-4e0d-bfcd-3e036911eb07\",\"users_id\":\"5e345186-704e-4839-8fbb-9e49a4bea5c6\",\"created_at\":\"2022-11-13T18:31:43.825Z\",\"updated_at\":\"2022-11-16T16:52:45.341Z\",\"rented_at\":\"2022-11-13T03:34:54.000Z\",\"next_rental_payment\":\"2022-11-14T03:34:54.000Z\",\"last_rental_payment\":\"2022-11-13T03:34:54.000Z\",\"edition\":7,\"card_detail_id\":375,\"level\":1,\"xp\":1,\"price\":0.235,\"is_gold\":false,\"card_uid\":\"C7-375-K61LXJ3IO0\",\"player_rented_to\":\"hayxanh619\",\"rental_tx\":\"ffe119c811db79da66cafb868e33f7602f521070\",\"sell_trx_id\":\"a401574c39e2cc6cd385072db6b3a0a7586e44f6-70\",\"sell_trx_hive_id\":\"a401574c39e2cc6cd385072db6b3a0a7586e44f6\",\"confirmed\":true}]
        */

        const numOfRentals = activeRentals?.length;
        const allEarnings = sumRentals({ activeRentals });

        if (!allEarnings) {
            // return null;
            return {
                totalEarnings: 69420,
                numOfRentals: 69420,
                suiteRentals: 69420,
                otherRentals: 69420,
                numSuiteRentals: 69420,
                numOtherRentals: 69420,
            };
        }

        logger.info(
            `/services/earnings/getEarningsForRange: users_id: ${users_id}, start_date: ${JSON.stringify(
                start_date
            )}, end_date: ${JSON.stringify(end_date)}, allEarnings.total: ${
                allEarnings?.total
            }, suiteRentals: ${allEarnings.suiteRentals}, otherRentals: ${
                allEarnings?.otherRentals
            }, numSuiteRentals: ${
                allEarnings?.numSuiteRentals
            }, numOtherRentals: ${
                allEarnings?.numOtherRentals
            }, numOfRentals: ${numOfRentals}`
        );
        return {
            totalEarnings: allEarnings?.total,
            numOfRentals,
            suiteRentals: allEarnings?.suiteRentals,
            otherRentals: allEarnings?.otherRentals,
            numSuiteRentals: allEarnings?.numSuiteRentals,
            numOtherRentals: allEarnings?.numOtherRentals,
        };
    } catch (err) {
        logger.error(
            `/services/earnings/getEarningsForRange error: ${err.message}`
        );
        throw err;
    }
};

const sumRentals = ({ activeRentals }) => {
    try {
        logger.debug('/services/earnings/sumRentals');

        let total = 0;
        let isNull = false;
        let suiteRentals = 0;
        let otherRentals = 0;
        let numSuiteRentals = 0;
        let numOtherRentals = 0;

        for (const rental of activeRentals) {
            total = total + rental.price;
            if (rental?.confirmed == null) {
                isNull = true;
                break;
            }
            if (rental?.confirmed) {
                suiteRentals = suiteRentals + rental.price;
                numSuiteRentals = numSuiteRentals + 1;
            } else {
                otherRentals = otherRentals + rental.price;
                numOtherRentals = numOtherRentals + 1;
            }
        }

        if (isNull) {
            logger.debug(`/services/earnings/sumRentals:`);
            return null;
        } else {
            logger.debug(`/services/earnings/sumRentals:`);
            return {
                total,
                suiteRentals,
                otherRentals,
                numSuiteRentals,
                numOtherRentals,
            };
        }
    } catch (err) {
        logger.error(`/services/earnings/sumRentals error: ${err.message}`);
        throw err;
    }
};

const getActiveRentalsForRange = async ({ users_id, start_date, end_date }) => {
    try {
        logger.debug(`/services/earnings/getActiveRentalsForRange`);

        const activeRentals = await UserRentals.query()
            .where({ users_id })
            .whereBetween('last_rental_payment', [start_date, end_date]);

        logger.debug('/services/earnings/getActiveRentalsForRange done');
        return activeRentals;
    } catch (err) {
        logger.error(
            `/services/earnings/getActiveRentalsForRange error: ${err.message}`
        );
        throw err;
    }
};

// created_at is the date that the users_id account was created in our db
const insertAllDailyEarnings = async ({ users_id, created_at }) => {
    try {
        logger.debug(`/services/earnings/insertAllDailyEarnings`);

        const createdAt = DateTime.fromJSDate(created_at);
        const startOfDay = utilDates.getStartOfDay({ date: createdAt });

        const now = DateTime.utc();
        const startOfToday = utilDates.getStartOfDay({ date: now });

        const yesterday = startOfToday.minus({ days: 1 });

        // this interval is the interval between the first day our account was created, and
        const interval = Interval.fromDateTimes(startOfDay, yesterday);

        const intervalDays = interval.length('days');
        // go through the days, starting with startOfDay through yesterday, and insert into dailyEarnings table a row for each

        let count = 0;
        let earnings_date = startOfDay;
        const alreadyEnteredDailyEarnings = await getDailyEarningsForUser({
            users_id,
        });

        const dailyEarningsDates = formatDbDailyEarnings({
            dailyEarnings: alreadyEnteredDailyEarnings,
        });
        while (count < intervalDays) {
            const { year, month, day } = earnings_date;
            const key = `${year},${month},${day}`;
            const dbEntry = dailyEarningsDates[key];

            if (!dbEntry) {
                await insertDailyEarnings({ users_id, earnings_date });
            }
            earnings_date = earnings_date.plus({ days: 1 });
            count = count + 1;
        }

        logger.info(
            `/services/earnings/insertAllDailyEarnings User ID: ${users_id}`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/earnings/insertAllDailyEarnings error: ${err.message}`
        );
        throw err;
    }
};

const formatDbDailyEarnings = ({ dailyEarnings }) => {
    try {
        logger.debug(`/services/earnings/formatDbDailyEarnings`);

        const earningsDates = dailyEarnings.map((earnings) => {
            const date = DateTime.fromJSDate(earnings.earnings_date);
            return date.toUTC(); // needed to keep this in DateTime structure rather than just a date structure
        });
        logger.debug(
            `/services/earnings/formatDbDailyEarnings earningsDates: ${JSON.stringify(
                earningsDates
            )}, dailyEarnings: ${JSON.stringify(dailyEarnings)}`
        );
        const uniqueDates = _.uniq(earningsDates);

        const uniqueObj = arrayToObj({ arr: uniqueDates });

        logger.debug(`/services/earnings/formatDbDailyEarnings`);
        return uniqueObj;
    } catch (err) {
        logger.error(
            `/services/earnings/formatDbDailyEarnings error: ${err.message}`
        );
        throw err;
    }
};

const arrayToObj = ({ arr }) => {
    try {
        logger.debug(`/services/earnings/arrayToObj`);

        const obj = {};
        arr.forEach((earnings_date) => {
            const { year, month, day } = earnings_date;
            const key = `${year},${month},${day}`;
            obj[key] = earnings_date;
        });

        logger.debug(`/services/earnings/arrayToObj`);
        return obj;
    } catch (err) {
        logger.error(`/services/earnings/arrayToObj error: ${err.message}`);
        throw err;
    }
};

const insertDailyEarnings = async ({ users_id, earnings_date }) => {
    try {
        logger.debug(`/services/earnings/insertDailyEarnings`);

        const dailyEarnings = await getEarningsForRange({
            users_id,
            start_date: earnings_date, // this will get the data for the entire 24 hour period in the day
            end_date: earnings_date.plus({ days: 1 }),
        });

        if (!dailyEarnings) {
            logger.warn(
                `user: ${users_id}, earnings_date: ${JSON.stringify(
                    earnings_date
                )}, some part of the userRentals had not been confirmed, skipping over it for now`
            );
            return null;
        } else {
            await DailyEarnings.query().insert({
                users_id,
                earnings_date,
                earnings_dec: dailyEarnings.totalEarnings,
                num_rentals: dailyEarnings.numOfRentals,
                bot_earnings_dec: dailyEarnings.suiteRentals,
                bot_num_rentals: dailyEarnings.numSuiteRentals,
            });

            logger.debug(`/services/earnings/insertDailyEarnings`);
            return dailyEarnings;
        }
    } catch (err) {
        logger.error(
            `/services/earnings/insertDailyEarnings error: ${err.message}`
        );
        throw err;
    }
};

const getDailyEarningsForDateRange = async ({
    users_id,
    start_date,
    end_date,
}) => {
    try {
        logger.debug(`/services/earnings/getDailyEarningsForDateRange`);

        const earnings = await DailyEarnings.query()
            .where({
                users_id,
            })
            .whereBetween('earnings_date', [start_date, end_date]);

        logger.debug(`/services/earnings/getDailyEarningsForDateRange`);
        return earnings;
    } catch (err) {
        logger.error(
            `/services/earnings/getDailyEarningsForDateRange error: ${err.message}`
        );
        throw err;
    }
};

const getDailyEarningsForUser = async ({ users_id }) => {
    try {
        logger.debug(`/services/earnings/getDailyEarningsForUser`);

        const earnings = await DailyEarnings.query().where({
            users_id,
        });

        // when none returned, will be an empty array
        logger.debug(`/services/earnings/getDailyEarningsForUser`);
        return earnings;
    } catch (err) {
        logger.error(
            `/services/earnings/getDailyEarningsForUser error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    get,
    insertAllDailyEarnings,
    getDailyEarningsForDateRange,
    getDailyEarningsForUser,
};
