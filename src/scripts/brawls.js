'use strict';
const logger = require('../util/pinologger');
const brawlService = require('../services/brawls');
const splinterlandsService = require('../services/splinterlands');

const extractSLBrawlData = (settings) => {
    try {
        logger.debug(`/scripts/brawls/extractSLBrawlData`);

        const { brawl_cycle } = settings;
        const { id, name, start, end } = brawl_cycle;

        logger.debug(`id: ${id}, name: ${name}, start: ${start}, end: ${end}`);
        logger.info(`/scripts/brawls/extractSLBrawlData`);
        return { id, name, start, end };
    } catch (err) {
        logger.error(
            `/scripts/brawls/extractSLBrawlData error: ${err.message}`
        );
        throw err;
    }
};

const getSLBrawlData = async () => {
    try {
        logger.debug(`/scripts/brawls/getSLBrawlData`);

        const data = await splinterlandsService.getSettings().catch((err) => {
            logger.error(
                `/scripts/brawls/getSLBrawlData getSettings error: ${err.message}`
            );
            throw err;
        });
        const brawlData = extractSLBrawlData(data);
        const duplicate = await brawlService.get({ brawlData }).catch((err) => {
            logger.error(
                `/scripts/brawls/getSLBrawlData get error: ${err.message}`
            );
            throw err;
        });

        logger.debug(`duplicate is: ${JSON.stringify(duplicate)}`);

        if (duplicate.length > 0) {
            logger.info(
                `we have already entered this brawl information before, duplicate: ${JSON.stringify(
                    duplicate
                )}`
            );
            process.exit(0);
        }

        await brawlService.create({ brawlData }).catch((err) => {
            logger.error(
                `/scripts/brawls/getSLBrawlData create error: ${err.message}`
            );
            throw err;
        });

        logger.info(`/scripts/brawls/getSLBrawlData`);
        process.exit(0);
    } catch (err) {
        logger.error(`/scripts/brawls/getSLBrawlData error: ${err.message}`);
        throw err;
    }
};

getSLBrawlData();
