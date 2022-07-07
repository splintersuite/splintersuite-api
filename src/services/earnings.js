'use strict';
const logger = require('../util/pinologger');
const UserRentals = require('../models/UserRentals');
const utilDates = require('../util/dates');
const DailyEarnings = require('../models/DailyEarnings');
const { DateTime } = require('luxon');

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
        // utc(year: number?, month: number, day: number, hour: number, minute: number, second: number, millisecond: number,
        const startOfDay = DateTime.utc(
            createdAt.year,
            createdAt.month,
            createdAt.day,
            0,
            0,
            0,
            0
        );
        const now = DateTime.utc();

        const startOfToday = DateTime.utc(
            now.year,
            now.month,
            now.day,
            0,
            0,
            0,
            0
        );
        logger.info(
            `startOfDay : ${JSON.stringify(startOfDay)}, now: ${JSON.stringify(
                now
            )}, startOfToday: ${JSON.stringify(startOfToday)}`
        );

        throw new Error('checking startOfDay');

        //         dt = DateTime.now();
        // dt.year     //=> 2017
        // dt.month    //=> 9
        // dt.day      //=> 14
        // dt.second   //=> 47
        // dt.weekday  //=> 4
    } catch (err) {
        logger.error(
            `/services/earnings/insertAllDailyEarnings error: ${err.message}`
        );
        throw err;
    }
};

const insertDayEarnings = async ({ users_id, earnings_date }) => {
    try {
        logger.debug(`/services/earnings/insertDailyEarnings`);

        const one = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 1,
            date: earnings_date,
        });
        // return { totalEarnings, numOfRentals };
        const dailyEarnings = await getEarningsForRange({
            users_id,
            start_date: one.daysAgo,
            end_date: earnings_date,
        });

        await insertDailyEarnings({
            users_id,
            earnings_date: one.daysAgo,
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

const insertDailyEarnings = async ({ users_id, earningsDate }) => {
    try {
        logger.debug(`/services/earnings/insertDailyEarnings`);

        await DailyEarnings.query().insert({
            users_id,
            earnings_date: earningsDate,
            earnings_dec,
            num_rentals,
            but_earnings_dec,
            bot_num_rentals,
        });

        logger.debug(`/services/earnings/insertDailyEarnings done`);
        return;
    } catch (err) {
        logger.error(
            `/services/earnings/insertDailyEarnings error: ${err.message}`
        );
        throw err;
    }
};
module.exports = {
    get,
    getEarningsForRange,
    insertAllDailyEarnings,
};
