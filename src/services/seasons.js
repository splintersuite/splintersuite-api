const logger = require('../util/pinologger');
const Seasons = require('../models/Seasons');

const create = async ({ seasonData }) => {
    try {
        logger.debug(`/services/seasons/create`);
        const { id, ends, name } = seasonData;

        const dbSeason = await Seasons.query().findOne({
            season_id: id,
            season_name: name,
        });

        if (!dbSeason) {
            const newSeason = await Seasons.query().insert({
                season_id: id,
                end_date: new Date(ends),
                season_name: name,
            });
            logger.info(
                `/services/seasons/create New Season: ${JSON.stringify(
                    newSeason
                )}`
            );
            return newSeason;
        }
        logger.info(
            `/services/seasons/create Season Exists: ${JSON.stringify(
                dbSeason
            )}`
        );
        return null;
    } catch (err) {
        console.error(`insertSeason error: ${err.message}`);
        throw err;
    }
};

const getLast = async () => {
    // TNT IDEA; should we add a boolean to season being active/ended? Therefore we could search for most recent season that ended cuz otherwise it would get season in progress
    logger.debug(`/services/seasons/getLast`);
    const season = await Seasons.query().orderBy('end_date', 'desc');
    return season[0];
};

module.exports = { create, getLast };
