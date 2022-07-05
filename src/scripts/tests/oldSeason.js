'use strict';

const logger = require('../../util/pinologger');
const seasonService = require('../../services/seasons');
const tntSeason = require('../../services/tntseasons');

const enterOldSeason = async ({ seasonData }) => {
    try {
        logger.debug(`/scripts/oneTime/oldSeason/create`);

        const newSeason = await seasonService.create({
            seasonData,
        });

        logger.info('enterOldSeasons done');
        return;
    } catch (err) {
        logger.error(`enterOldSeasons error: ${err.message}`);
        throw err;
    }
};

const enterAllOldSeasons = async () => {
    try {
        logger.debug(`/scripts/oneTime/oldSeason/create`);

        const sesasonData = {
            id: 88,
            name: 'Splinterlands Season 74',
            ends: '2022-06-15T14:00:00.000Z',
        };

        const season1Data = {
            id: 89,
            name: 'Ranked Rewards Season 2',
            ends: '2022-06-30T14:00:00.000Z',
        };

        await enterOldSeason({ seasonData: sesasonData });
        await tntSeason.create({ seasonData: season1Data });

        logger.info('enterAllOldSeasons done');
        process.exit(0);
    } catch (err) {
        logger.error(`enterAllOldSeasons error: ${err.message}`);
        throw err;
    }
};

enterAllOldSeasons();
