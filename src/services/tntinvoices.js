'use strict';
const logger = require('../util/pinologger');
const _ = require('lodash');
const Invoices = require('../models/Invoices');

const Seasons = require('../models/Seasons');

const Users = require('../models/Users');
const utilDates = require('../util/dates');
const earnings = require('./earnings');

const getForUser = async ({ users_id }) => {
    try {
        logger.debug(`/services/invoices/get`);
        // TNT Question: should we have this only gives us unpaid invoices?
        const invoices = await Invoices.query()
            .where({ users_id })
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

const create = async ({ users_id, start_date, end_date }) => {
    try {
        logger.debug(`/services/invoices/create`);

        const earnings = await earnings.getEarningsForRange({
            users_id,
            start_date,
            end_date,
        });
        const now = new Date();
        // const seven = utilDates.getNumDaysFromNow({ numberOfDaysFromNow: 7 });
        const three = utilDates.getNumDaysLater({
            numberOfDaysFromNow: 3,
            date: now,
        });
        const five = utilDates.getNumDaysLater({
            numberOfDaysFromNow: 5,
            date: now,
        });
        // how much we are taking in fees, which is 2.5%
        const ourcut = earnings?.suiteRentals * 0.025;
        const amountDue = _.round(ourcut, 2);

        const invoice = {
            users_id,
            discounted_due_at: three.daysFromNow,
            due_at: five.daysFromNow,
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
