'use strict';
const logger = require('../util/pinologger');
const UserRentals = require('../models/UserRentals');

const utilDates = require('../util/dates');

const get = async ({ users_id }) => {
    try {
        logger.debug('/services/tntearnings/get');

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
        logger.error(`/services/tntearnings/get error: ${err.message}`);
        throw err;
    }
};

const getEarningsForDaysAgo = async ({ numberOfDaysAgo, now, users_id }) => {
    try {
        logger.debug('/services/tntearnings/getEarningsForDaysAgo');

        const { daysAgo } = utilDates.getNumDaysAgo({
            numberOfDaysAgo,
            date: now,
        });

        const activeRentalsforDays = await getActiveRentalsFromDate({
            users_id,
            date: daysAgo,
            now,
        });

        const daysEarnings = sumRentals({
            activeRentals: activeRentalsforDays,
        });
        logger.info(`/services/tntearnings/getEarningsForDaysAgo done`);

        return daysEarnings;
    } catch (err) {
        logger.error(
            `/services/tntearnings/getEarningsForDaysAgo error: ${err.message}`
        );
        throw err;
    }
};

const sumRentals = ({ activeRentals }) => {
    try {
        logger.debug('/services/tntearnings/sumRentals');

        let total = 0;
        activeRentals.forEach((rental) => {
            total = total + rental.price;
        });
        logger.info(`/services/tntearnings/sumRentals`);

        return total;
    } catch (err) {
        logger.error(`/services/tntearnings/sumRentals error: ${err.message}`);
        throw err;
    }
};

const getActiveRentalsFromDate = async ({ users_id, date, now }) => {
    try {
        logger.debug(`/services/tntearnings/getActiveRentalsFromDate`);

        const activeRentals = await UserRentals.query()
            .where({ users_id })
            .whereBetween('last_rental_payment', [date, now]);
        logger.info('/services/tntearnings/getActiveRentalsFromDate done');

        return activeRentals;
    } catch (err) {
        logger.error(
            `/services/tntearnings/getActiveRentalsFromDate error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    get,
};
