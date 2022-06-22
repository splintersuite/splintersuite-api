const logger = require('../../util/pinologger');
const seasonService = require('../../services/seasons');
const invoiceService = require('../../services/invoices');
const splinterlandsService = require('../../services/splinterlands');

const extractSLSeasonData = (settings) => {
    try {
        logger.debug(`extractSLSeasonData start`);
        const { season } = settings;
        const { id, name, ends } = season;
        return { id, name, ends };
    } catch (err) {
        logger.error(`extractSLSeasonData error: ${err.message}`);
        throw err;
    }
};

// TNT TODO: use a different scheduler so we hit like an hour after end of season coming up

const getSLSeasonData = async () => {
    try {
        logger.debug(`getSLSeasonData start`);
        const data = await splinterlandsService.getSettings();
        const seasonData = extractSLSeasonData(data);
        const newSeason = await seasonService.create({
            seasonData,
        });

        if (newSeason) {
            // create invoices for LAST season!
            await invoiceService.create();
            const userIdsToLock = await invoiceService.lockUsers();
            await invoiceService.unlockUsers({ userIdsToLock });
        }
        logger.info('getSLSeasonData done');
        process.exit(0);
    } catch (err) {
        logger.error(`getSLSeasonData error: ${err.message}`);
        throw err;
    }
};

getSLSeasonData();
