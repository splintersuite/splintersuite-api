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

        const numberOfDaysAgo = 1;
        const now = new Date();
        const { daysAgo, msDaysAgo, nowMs } = utilDates.getNumDaysAgo({
            numberOfDaysAgo,
            date: now,
        });

        const { oneDayAgoInMS, oneDayAgo } = utilDates.getOneDayAgo({
            date: now,
        });
        logger.info(
            `daysAgo: ${daysAgo}, msDaysAgo: ${msDaysAgo}, nowMs: ${nowMs}`
        );
        logger.info(`oneDayAgoInMs: ${oneDayAgoInMS}, oneDayAgo: ${oneDayAgo}`);

        return;
        // we need an sql statement that lets us select from user_rentals .where ({users_id}), whereBetween 'whatevertime, now');
        // we could then use this to get back the daily earnings from the past 24 hours, past week, and past 30 days, or past whenever, just able to be computed.
        // we can then add this up and save the say 30 days of earnings of whatever we want to save in DailyEarnings
    } catch (err) {
        logger.error(`/services/tntearnings/get error: ${err.message}`);
        throw err;
    }
};

const getActiveRentalsFromDate = ({ date }) => {
    try {
        logger.debug(`/services/tntearnings/getActiveRentalsFromDate`);

        const activeRentals = UserRentals.query()
            .where({ users_id })
            .whereBetween('last_rental_payment', [date, now]);
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
