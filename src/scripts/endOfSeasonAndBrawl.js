const axiosInstance = require('../util/axiosInstance');
const {
    insertBrawl,
    insertSeason,
} = require('../actions/insertBrawlAndSeasonData');
const {
    createInvoicesForSeason,
    unlockUsers,
    lockPastDueUsers,
} = require('../actions/invoices');
const logger = require('../util/pinologger');

const getSplinterlandsSettings = async () => {
    try {
        logger.debug('getSplinterlandsSettings start');

        const url = 'https://api2.splinterlands.com/settings';

        const res = await axiosInstance(url);

        const data = res.data;

        return data;
    } catch (err) {
        logger.error(`getSplinterlandsSettings error: ${err.message}`);
        throw err;
    }
};

const getSLSeasonData = (settings) => {
    try {
        logger.debug(`getSLSeasonData start`);

        const { season } = settings;

        const { id, name, ends } = season;

        return { id, name, ends };
    } catch (err) {
        console.error(`getSlSeasonData error: ${err.message}`);
        throw err;
    }
};

const getSLBrawlData = (settings) => {
    try {
        logger.debug(`getSLBrawlData start`);

        const { brawl_cycle } = settings;

        const { id, name, start, end } = brawl_cycle;

        return { id, name, start, end };
    } catch (err) {
        console.error(`getSLBrawlData error: ${err.message}`);
        throw err;
    }
};

// output of getSLSeasonAndBrawlData function:
// seasonData, brawlData:
// {
//   id: 88,
//   name: 'Splinterlands Season 74',
//   ends: '2022-06-15T14:00:00.000Z'
// } {
//   id: 89,
//   name: 'Brawl Cycle 89',
//   start: '2022-06-13T06:00:00.000Z',
//   end: '2022-06-18T07:00:00.000Z'
// }

// runs every 4 days
const getSLSeasonAndBrawlData = async () => {
    try {
        logger.debug('getSLSeasonData start');

        const data = await getSplinterlandsSettings();

        const seasonData = getSLSeasonData(data);

        const brawlData = getSLBrawlData(data);

        await insertBrawl({ brawlData }).catch((err) => {
            logger.error(`insertBrawl error: ${err.message}`);
        });

        // create invoices for LAST season!
        // await createInvoicesForSeason();
        const newSeason = await insertSeason({ seasonData });
        if (newSeason) {
            const userIdsToLock = await lockPastDueUsers();
            await unlockUsers({ userIdsToLock });
        }
        return;
    } catch (err) {
        console.error(`getSLSeasonData error: ${err.message}`);
        throw err;
    }
};

getSLSeasonAndBrawlData();

module.exports = { getSLSeasonAndBrawlData };
