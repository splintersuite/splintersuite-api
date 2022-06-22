const { getSplinterlandsSettings } = require('../../actions/SL_API');
const logger = require('../../util/pinologger');
const brawl = require('../../actions/brawl');

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
            process.exit(0);
        }

        await brawl.insertBrawl({ brawlData }).catch((err) => {
            logger.error(`insertBrawl error: ${err.message}`);
            throw err;
        });
        logger.info(`getSlBrawl done`);
        process.exit(0);
    } catch (err) {
        logger.error(`getSLBrawlData error: ${err.message}`);
        throw err;
    }
};

getSLBrawlData();
