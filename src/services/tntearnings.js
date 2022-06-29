'use strict';
const logger = require('../util/pinologger');
const UserRentals = require('../models/UserRentals');
const DailyEarnings = require('../models/DailyEarnings');
const { SPLINTERSUITE_BOT } = require('./rentals/types');
const utilDates = require('../util/dates');

const get = async ({ users_id }) => {
    try {
        logger.debug('/services/tntearnings/get');

        logger.info('testing to see if utilDates.getNumDaysAgo is working');

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
        /*
        const one = utilDates.getNumDaysAgo({
            numberOfDaysAgo: oneDay,
            date: now,
        });

        const seven = utilDates.getNumDaysAgo({
            numberOfDaysAgo: oneWeek,
            date: now,
        });

        const thirty = utilDates.getNumDaysAgo({
            numberOfDaysAgo: oneMonth,
            date: now,
        });
        const dailyRentals = await getActiveRentalsFromDate({
            users_id,
            date: one.daysAgo,
            now,
        });

        const weeklyRentals = await getActiveRentalsFromDate({
            users_id,
            date: seven.daysAgo,
            now,
        });

        const monthlyRentals = await getActiveRentalsFromDate({
            users_id,
            date: thirty.daysAgo,
            now,
        });

        const dailyEarnings = sumRentals({ activeRentals: dailyRentals });

        const weeklyEarnings = sumRentals({ activeRentals: weeklyRentals });

        const monthlyEarnings = sumRentals({ activeRentals: monthlyRentals });
*/
        logger.info(
            `dailyEarnings: ${dailyEarnings}, weeklyEarnings: ${weeklyEarnings}, monthlyEarnings: ${monthlyEarnings}`
        );

        // need to sum these to get actual daily earnings

        return;
        // we need an sql statement that lets us select from user_rentals .where ({users_id}), whereBetween 'whatevertime, now');
        // we could then use this to get back the daily earnings from the past 24 hours, past week, and past 30 days, or past whenever, just able to be computed.
        // we can then add this up and save the say 30 days of earnings of whatever we want to save in DailyEarnings
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
        logger.info(`/services/tntearnings/getEarningsForDaysAgo`);
        return daysEarnings;
    } catch (err) {
        logger.error();
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
