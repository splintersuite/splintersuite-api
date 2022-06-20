const { getSplinterlandsSettings } = require('./getSLAPI');
const logger = require('../util/pinologger');
//const { insertBrawl, } = require('../actions/insertBrawlAndSeasonData');
const brawl = require('../actions/brawl');
const knex = require('knex');

const extractSLBrawlData = (settings) => {
    try {
        logger.debug(`gextractSLBrawlData start`);

        const { brawl_cycle } = settings;

        const { id, name, start, end } = brawl_cycle;

        return { id, name, start, end };
    } catch (err) {
        logger.error(`extractSLBrawlData error: ${err.message}`);
        throw err;
    }
};

const getSLBrawlData = async () => {
    try {
        logger.info('getSLBrawlData start');

        const data = await getSplinterlandsSettings();

        const brawlData = extractSLBrawlData(data);

        const duplicate = await brawl.getBrawl({ brawlData });

        if (duplicate.length > 0) {
            logger.info(
                `we have already entered this brawl information before, duplicate: ${JSON.stringify(
                    duplicate
                )}`
            );
            return;
        }

        await brawl.insertBrawl({ brawlData }).catch((err) => {
            logger.error(`insertBrawl error: ${err.message}`);
            throw err;
        });
        logger.info(`getSlBrawl finished with res: `);
        logger.info(res);
        // knex.destroy()
        //     .then((res) =>
        //         logger.info(`knex.destroy res:${JSON.stringify(res)}`)
        //     )
        //     .catch((err) => logger.error(`knex.destroy error: ${err.message}`));
        return;
    } catch (err) {
        logger.error(`getSLBrawlData error: ${err.message}`);
        throw err;
    }
};

getSLBrawlData();
