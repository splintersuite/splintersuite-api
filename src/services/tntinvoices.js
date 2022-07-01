const logger = require('../util/pinologger');

const Invoices = require('../models/Invoices');

const Seasons = require('../models/Seasons');

const Users = require('../models/Users');

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

// ---
// Create invoices for the previous season
// ------------------------------------
const create = async ({ start_date, end_date }) => {
    try {
        logger.debug(`/services/invoices/create`);
    } catch (err) {
        logger.error(`/services/invoices/create error: ${err.message}`);
        throw err;
    }
};
