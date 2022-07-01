'use strict';
const logger = require('../util/pinologger');
const UserRentals = require('../models/UserRentals');
const utilDates = require('../util/dates');

const get = async ({ users_id }) => {
    try {
        logger.debug('/services/earnings/get');

        const oneDay = 1;
        const oneWeek = 7;
        const oneMonth = 30;
        const now = new Date();

        const dailyEarnings = await getEarningsForDaysAgo({
            numberOfDaysAgo: oneDay,
            now,
            users_id,
        });

        const weeklyEarnings = await getEarningsForDaysAgo({
            numberOfDaysAgo: oneWeek,
            now,
            users_id,
        });

        const monthlyEarnings = await getEarningsForDaysAgo({
            numberOfDaysAgo: oneMonth,
            now,
            users_id,
        });

        logger.info(
            `dailyEarnings: ${dailyEarnings}, weeklyEarnings: ${weeklyEarnings}, monthlyEarnings: ${monthlyEarnings}`
        );

        return;
    } catch (err) {
        logger.error(`/services/earnings/get error: ${err.message}`);
        throw err;
    }
};

const getTnt = async ({ users_id }) => {
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

        const dailyEarnings = await tntgetEarningsForRange({
            users_id,
            start_date: one.daysAgo,
            end_date: now,
        });

        const weeklyEarnings = await tntgetEarningsForRange({
            users_id,
            start_date: seven.daysAgo,
            end_date: now,
        });

        const monthlyEarnings = await tntgetEarningsForRange({
            users_id,
            start_date: thirty.daysAgo,
            end_date: now,
        });

        logger.info(
            `/services/earnings/get for users_id: ${users_id}, dailyEarnings: ${dailyEarnings}, weeklyEarnings: ${weeklyEarnings}, monthlyEarnings: ${monthlyEarnings}`
        );

        return { dailyEarnings, weeklyEarnings, monthlyEarnings };
    } catch (err) {
        logger.error(`/services/earnings/get error: ${err.message}`);
        throw err;
    }
};

const tntgetEarningsForRange = async ({ users_id, start_date, end_date }) => {
    try {
        logger.debug('/services/earnings/getEarningsForRange');

        const activeRentals = await getActiveRentalsForRange({
            users_id,
            start_date,
            end_date,
        });

        const totalEarnings = sumRentals({
            activeRentals,
        });

        logger.info(`/services/earnings/getEarningsForRange done`);
        return totalEarnings;
    } catch (err) {
        logger.error(
            `/services/earnings/getEarningsForRange error: ${err.message}`
        );
        throw err;
    }
};

const getEarningsForDaysAgo = async ({ numberOfDaysAgo, now, users_id }) => {
    try {
        logger.debug('/services/earnings/getEarningsForDaysAgo');

        const { daysAgo } = utilDates.getNumDaysAgo({
            numberOfDaysAgo,
            date: now,
        });

        const activeRentalsforDays = await getActiveRentalsForRange({
            users_id,
            start_date: daysAgo,
            end_date: now,
        });

        const daysEarnings = sumRentals({
            activeRentals: activeRentalsforDays,
        });
        logger.info(`/services/earnings/getEarningsForDaysAgo done`);

        return daysEarnings;
    } catch (err) {
        logger.error(
            `/services/earnings/getEarningsForDaysAgo error: ${err.message}`
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

module.exports = {
    get,
    getEarningsForDaysAgo,
    getTnt,
};
