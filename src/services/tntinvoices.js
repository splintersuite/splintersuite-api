'use strict';
const logger = require('../util/pinologger');
const _ = require('lodash');
const Invoices = require('../models/Invoices');

const Seasons = require('../models/Seasons');

const Users = require('../models/Users');
const utilDates = require('../util/dates');
const earningsService = require('./earnings');
const { DateTime } = require('luxon');

const getForUser = async ({ users_id }) => {
    try {
        logger.debug(`/services/invoices/get`);
        // TNT Question: should we have this only gives us unpaid invoices?
        const invoices = await Invoices.query()
            .where({ users_id })
            .where('amount_due', '>', 0)
            .catch((err) => {
                logger.error(
                    `/services/invoices/get Invoices query of users_id: ${users_id} error: ${err.message}`
                );
                throw err;
            });

        logger.debug(`/services/invoices/get:`);
        return invoices;
    } catch (err) {
        logger.error(`/services/invoices/get error: ${err.message}`);
        throw err;
    }
};

const create = async ({
    users_id,
    start_date,
    end_date,
    first_invoice = false,
    firstDayAdjustment = 0,
}) => {
    try {
        logger.debug(`/services/invoices/create`);

        // this queries the DailyEarnings table by users_id, from start_date to end_date
        const earnings = await earningsService.getDailyEarningsForDateRange({
            users_id,
            start_date,
            end_date,
        });
        logger.info(
            `/services/invoices/create users_id: ${users_id}, start_date: ${start_date}, end_date: ${end_date}, earnings: ${JSON.stringify(
                earnings
            )}, num of days earnings: ${earnings?.length}`
        );
        // this filter prevents us from double counting the end_date when we do the start_date on the next call, also gives us 15 days rather than 16
        const newEarnings = earnings.filter((record) => {
            if (record?.earnings_date < end_date) {
                return true;
            } else {
                return false;
            }
        });
        logger.info(
            `newEarnings: ${JSON.stringify(newEarnings)}, numOfDaysEarnings: ${
                newEarnings?.length
            }`
        );

        if (newEarnings?.length < 15) {
            logger.warn(
                `for user: ${users_id}, start_date: ${start_date}, end_date: ${end_date}, has less than 15 days of earning. newEarnings.length: ${newEarnings?.length}`
            );
            return;
        }
        // throw new Error('checking newEarnings');
        const botEarnings = sumDailyEarnings({ dailyEarnings: newEarnings });
        // WE NEED TO FIND OUT EXACTLY HOW TO JUST DROP THE ARRAY FROM earnings that EARNINGS_DATE EQUALS THE END_DATE
        const now = DateTime.utc();

        const threeDaysFromNow = now.plus({ days: 3 });
        const fiveDaysFromNow = now.plus({ days: 5 });

        // how much we are taking in fees, which is 2.5%
        const ourcut = botEarnings * 0.025;
        // TNT TODO: insert the firstDayAdjustment after
        const amountDue = _.round(ourcut, 2);

        const invoice = {
            users_id,
            discounted_due_at: threeDaysFromNow,
            // discounted_due_at: three.daysFromNow,
            due_at: fiveDaysFromNow,
            // due_at: five.daysFromNow,
            amount_due: parseFloat(amountDue),
            start_date,
            end_date,
        };

        await Invoices.query()
            .insert(invoice)
            .catch((err) => {
                logger.error(
                    `/services/invoices/create inserting invoice: ${invoice} error: ${err.message}`
                );
                throw err;
            });

        logger.info(
            `/services/invoices/create User ID: ${users_id}, start_date: ${start_date}, end_date: ${end_date}`
        );
        return;
    } catch (err) {
        logger.error(`/services/invoices/create error: ${err.message}`);
        throw err;
    }
};

const sumDailyEarnings = ({ dailyEarnings }) => {
    try {
        logger.debug(`/services/invoices/sumDailyEarnings start`);

        let total = 0;
        for (const dailyEarning of dailyEarnings) {
            total = total + dailyEarning?.bot_earnings_dec;
        }

        logger.debug(`/services/invoices/sumDailyEarnings: ${total}`);
        return total;
    } catch (err) {
        logger.error(
            `/services/invoices/sumDailyEarnings error: ${err.message}`
        );
        throw err;
    }
};

const lockUsers = async () => {
    try {
        logger.debug(`/services/invoices/lockUsers`);
        const nowTime = new Date().getTime();

        const invoices = await Invoices.query().where({
            paid_at: null,
        });
        const usersIdsToLock = [];

        invoices.forEach((invoice) => {
            if (nowTime > invoice.due_at.getTime()) {
                usersIdsToLock.push(invoice.users_id);
            }
        });

        let chunks = usersIdsToLock;

        if (usersIdsToLock.length > 1000) {
            chunks = _.chunk(usersIdsToLock, 1000);
        }
        if (chunks.length === usersIdsToLock.length) {
            chunks = [chunks];
        }

        for (const idChunk of chunks) {
            await Users.query().whereIn('id', idChunk).patch({ locked: true });
        }

        logger.info(`/services/invoices/lockUsers`);
        return usersIdsToLock;
    } catch (err) {
        logger.error(`/services/invoices/lockUsers error: ${err.message}`);
        throw err;
    }
};

const unlockUser = async ({ users_id }) => {
    try {
        logger.debug(`/services/invoices/unlockUser`);

        await Users.query().where('id', users_id).patch({ locked: false });

        logger.info(`/services/invoices/unlockUser User ID: ${users_id}`);
        return;
    } catch (err) {
        logger.error(`/services/invoices/unlockUsers error: ${err.message}`);
        throw err;
    }
};

module.exports = {
    getForUser,
    unlockUser,
    lockUsers,
    create,
};
