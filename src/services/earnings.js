'use strict';
const logger = require('../util/pinologger');
const UserRentals = require('../models/UserRentals');
const utilDates = require('../util/dates');

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

        const dailyEarnings = await getEarningsForRange({
            users_id,
            start_date: one.daysAgo,
            end_date: now,
        });

        const weeklyEarnings = await getEarningsForRange({
            users_id,
            start_date: seven.daysAgo,
            end_date: now,
        });

        const monthlyEarnings = await getEarningsForRange({
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

const getEarningsForRange = async ({ users_id, start_date, end_date }) => {
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
    getEarningsForRange,
};
