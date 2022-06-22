const logger = require('../util/pinologger');
const Brawls = require('../models/Brawls');

// const insertBrawl = async ({ brawlData }) => {
const create = async ({ brawlData }) => {
    try {
        logger.debug(`/services/brawls/create`);
        const { id, start, end, name } = brawlData;
        const start_date = new Date(start);
        const end_date = new Date(end);

        await Brawls.query().insert({
            brawl_id: id,
            start_date,
            end_date,
            name,
        });
        return;
    } catch (err) {
        logger.error(`insertBrawl error: ${err.message}`);
        throw err;
    }
};

// const getBrawl = async ({ brawlData }) => {
const get = async ({ brawlData }) => {
    try {
        logger.debug(`/services/brawls/get`);
        const { start, end } = brawlData;
        const start_date = new Date(start);
        const end_date = new Date(end);

        const brawl = await Brawls.query()
            .where({
                start_date,
            })
            .orWhere({ end_date });
        return brawl;
    } catch (err) {
        logger.error(`getBrawl error: ${err.message}`);
        throw err;
    }
};
module.exports = {
    create,
    get,
};
