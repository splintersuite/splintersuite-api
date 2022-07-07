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

        const total = { daily, wtd, mtd };
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
        const numOfRentals = activeRentals.length;
        const totalEarnings = sumRentals({
            activeRentals,
        });

        logger.info(`/services/earnings/getEarningsForRange done`);
        return { totalEarnings, numOfRentals };
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
        activeRentals.forEach((rental) => {
            total = total + rental.price;
        });

        logger.info(`/services/earnings/sumRentals`);
        return total;
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

        logger.info('/services/earnings/getActiveRentalsForRange done');
        return activeRentals;
    } catch (err) {
        logger.error(
            `/services/earnings/getActiveRentalsForRange error: ${err.message}`
        );
        throw err;
    }
};

const insertAllDailyEarnings = async ({ users_id, created_at }) => {
    try {
        logger.debug(`/services/earnings/insertAllDailyEarnings`);

        const createdAt = DateTime.fromJSDate(created_at);
        const startOfDay = utilDates.getStartOfDay({ date: createdAt });
        logger.info(`startOfDay is: ${JSON.stringify(startOfDay)}`);
        const now = DateTime.utc();
        const startOfToday = utilDates.getStartOfDay({ date: now });
        logger.info(`startOfToday is: ${JSON.stringify(startOfToday)}`);
        const yesterday = startOfToday.minus({ days: 1 });
        logger.info(`yesterday is: ${JSON.stringify(yesterday)}`);
        const interval = Interval.fromDateTimes(startOfDay, yesterday);

        const intervalDays = interval.length('days');
        // go through the days, starting wiht startOfDay through yesterday, and insert into dailyEarnings table a row for each

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
            logger.info(
                `dbEntry is: ${JSON.stringify(
                    dbEntry
                )}, dailyEarningsDates: ${JSON.stringify(dailyEarningsDates)},
                earnings_date: ${JSON.stringify(earnings_date)},
                year: ${year}, month: ${month}, day: ${day}`
            );
            if (!dbEntry) {
                await insertDayEarnings({ users_id, earnings_date });
            }
            earnings_date = earnings_date.plus({ days: 1 });
            count = count + 1;
        }

        logger.info(`/services/earnings/insertAllDailyEarnings done`);
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
        logger.info(
            `/services/earnings/formatDbDailyEarnings earningsDates: ${JSON.stringify(
                earningsDates
            )}, dailyEarnings: ${JSON.stringify(dailyEarnings)}`
        );
        const uniqueDates = _.uniq(earningsDates);

        const uniqueObj = arrayToObj({ arr: uniqueDates });
        logger.info(`/services/earnings/formatDbDailyEarnings done`);
        logger.info(
            `uniqueDates: ${JSON.stringify(
                uniqueDates
            )}, uniqueObj: ${JSON.stringify(uniqueObj)}`
        );
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
            logger.info(`earnings_date: ${JSON.stringify(earnings_date)}`);
            const key = `${year},${month},${day}`;
            obj[key] = earnings_date;
        });

        logger.debug(`/services/earnings/arrayToObj done`);
        return obj;
    } catch (err) {
        logger.error(`/services/earnings/arrayToObj error: ${err.message}`);
        throw err;
    }
};

const insertDayEarnings = async ({ users_id, earnings_date }) => {
    try {
        logger.debug(`/services/earnings/insertDailyEarnings`);

        const dailyEarnings = await getEarningsForRange({
            users_id,
            start_date: earnings_date, // this will get the data for the entire 24 hour period in the day
            end_date: earnings_date.plus({ days: 1 }),
        });

        await DailyEarnings.query().insert({
            users_id,
            earnings_date,
            earnings_dec: dailyEarnings.totalEarnings,
            num_rentals: dailyEarnings.numOfRentals,
            bot_earnings_dec: dailyEarnings.totalEarnings,
            bot_num_rentals: dailyEarnings.numOfRentals,
        });

        logger.info(`/services/earnings/insertDailyEarnings done`);
        return dailyEarnings;
    } catch (err) {
        logger.error(`/services/earnings/ error: ${err.message}`);
        throw err;
    }
};

const getDailyEarningsForDateRange = async ({ users_id, earningsDate }) => {
    try {
        logger.debug(`/services/earnings/getDailyEarningsForDate`);

        const [earnings] = await DailyEarnings.query().where({
            users_id,
            earnings_date: earningsDate,
        });

        logger.debug(`/services/earnings/getDailyEarningsForDate done`);
        return earnings;
    } catch (err) {
        logger.error(
            `/services/earnings/getDailyEarningsForDate error: ${err.message}`
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
        logger.debug(`/services/earnings/getDailyEarningsForUser done`);
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
    getEarningsForRange,
    insertAllDailyEarnings,
};
