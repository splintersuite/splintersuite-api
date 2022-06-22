const {
    insertBrawl,
    insertSeason,
} = require('../src/actions/insertBrawlAndSeasonData');
const {
    createInvoicesForSeason,
    unlockUsers,
    lockPastDueUsers,
} = require('../src/actions/invoices');
const logger = require('../src/util/pinologger');

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
        await createInvoicesForSeason();
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