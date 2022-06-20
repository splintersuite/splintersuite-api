const { getSplinterlandsSettings } = require('./getSLAPI');
const logger = require('../util/pinologger');
const season = require('../actions/season');

const invoices = require('../actions/invoices');

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
        const data = await getSplinterlandsSettings();

        const seasonData = extractSLSeasonData(data);

        const newSeason = await season.insertSeason({ seasonData });

        // create invoices for LAST season!
        await invoices.createInvoicesForSeason();
        if (newSeason) {
            const userIdsToLock = await invoices.lockPastDueUsers();
            await invoices.unlockUsers({ userIdsToLock });
        }
        logger.info('getSLSeasonData done');
        process.exit(0);
    } catch (err) {
        logger.error(`getSLSeasonData error: ${err.message}`);
        throw err;
    }
};

getSLSeasonData();
