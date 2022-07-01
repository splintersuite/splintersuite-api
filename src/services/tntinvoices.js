const logger = require('../util/pinologger');
const _ = require('lodash');
const Invoices = require('../models/Invoices');

const Seasons = require('../models/Seasons');

const Users = require('../models/Users');
const utilDates = require('../util/dates');
const earnings = require('./earnings');

const get = async ({ users_id }) => {
    try {
        logger.debug(`/services/invoices/get`);
        // TNT Question: should we have this only gives us unpaid invoices?
        const invoices = await Invoices.query()
            .where({ users_id })
            .catch((err) => {
                logger.error(
                    `/services/invoices/get query for invoices of users_id: ${users_id} error: ${err.message}`
                );
                throw err;
            });

        logger.debug(`/services/invoices/get done`);
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

        const seven = utilDates.getNumDaysFromNow({ numberOfDaysFromNow: 7 });
        const three = utilDates.getNumDaysFromNow({ numberOfDaysFromNow: 3 });

        const ourcut = earnings * 0.1;
        const amountDue = _.round(ourcut, 2);

        const invoice = {
            users_id,
            discounted_due_at: three.daysFromNow,
            due_at: seven.daysFromNow,
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
            `/services/invoices/create done for users_id: ${users_id}, start_date: ${start_date}, end_date: ${end_date}`
        );
        return;
    } catch (err) {
        logger.error(`/services/invoices/create error: ${err.message}`);
        throw err;
    }
};
