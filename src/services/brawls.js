'use strict';
const logger = require('../util/pinologger');
const Brawls = require('../models/Brawls');

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

        logger.info(
            `/services/brawls/create ID: ${id}, Start: ${start}, End: ${end}, name: ${name}`
        );
        return;
    } catch (err) {
        logger.error(`/services/brawls/create error: ${err.message}`);
        throw err;
    }
};

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
            .orWhere({ end_date })
            .catch((err) => {
                logger.error(
                    `/services/brawls/get table query error: ${err.message}`
                );
                throw err;
            });

        logger.info(
            `/services/brawls/get Start Date: ${start_date}, End Date: ${end_date}, DB Result: ${JSON.stringify(
                brawl
            )}`
        );
        return brawl;
    } catch (err) {
        logger.error(`/services/brawls/get error: ${err.message}`);
        throw err;
    }
};
module.exports = {
    create,
    get,
};
