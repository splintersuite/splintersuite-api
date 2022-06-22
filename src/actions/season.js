const Seasons = require('../models/Seasons');
const logger = require('../util/pinologger');

const insertSeason = async ({ seasonData }) => {
    try {
        logger.debug('insertSeason start');
        const { id, ends, name } = seasonData;

        const dbSeason = await Seasons.query().findOne({
            season_id: id,
            season_name: name,
        });

        // const now = new Date();
        if (!dbSeason) {
            logger.debug(
                `previous season not found, season: ${JSON.stringify(dbSeason)}`
            );
            //} && now.getTime() > dbSeason.end_date.getTime()) {
            const newSeason = await Seasons.query().insert({
                season_id: id,
                end_date: new Date(ends),
                season_name: name,
            });

            return newSeason;
        } else {
            logger.debug('season already inserted');
            return null;
        }
    } catch (err) {
        logger.error(`insertSeason error: ${err.message}`);
        throw err;
    }
};

const getMostRecentSeason = async () => {
    // TNT IDEA; should we add a boolean to season being active/ended? Therefore we could search for most recent season that ended cuz otherwise it would get season in progress

    const season = await Seasons.query().orderBy('end_date', 'desc');
    return season[0];
};

module.exports = {
    insertSeason,
    getMostRecentSeason,
};
