'use strict';

const logger = require('../../util/pinologger');
const seasonService = require('../../services/seasons');

const sesasonData = {
    id: 88,
    name: 'Splinterlands Season 74',
    ends: '2022-06-15T14:00:00.000Z',
};

const enterOldSeason = async ({ seasonData }) => {
    try {
        logger.debug(`/scripts/oneTime/oldSeason/create`);

        const newSeason = await seasonService.create({
            seasonData,
        });

        logger.info('enterOldSeason done');
        process.exit(0);
    } catch (err) {
        logger.error(`enterOldSeason error: ${err.message}`);
        throw err;
    }
};

enterOldSeason({ seasonData: sesasonData });
