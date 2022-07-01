const logger = require('../util/pinologger');
const Seasons = require('../models/Seasons');

const create = async ({ seasonData }) => {
    try {
        logger.debug(`/services/seasons/create`);
        const { id, ends, name } = seasonData;

        const dbSeason = await Seasons.query()
            .findOne({
                season_id: id,
                season_name: name,
            })
            .catch((err) => {
                logger.error(
                    `/services/seasons/create findOne season_id: ${id}, season_name: ${name} error: ${err.message}`
                );
                throw err;
            });

        if (!dbSeason) {
            const newSeason = await Seasons.query()
                .insert({
                    season_id: id,
                    end_date: new Date(ends),
                    season_name: name,
                })
                .catch((err) => {
                    logger.error(
                        `/services/seasons/create insert new season with season_id: ${id}, season_name: ${name}, end_date: ${new Date(
                            ends
                        )} error: ${err.message}`
                    );
                    throw err;
                });

            logger.info(`/services/seasons/create created new season`);
            return newSeason;
        }

        logger.info('/services/seasons/create no new season');
        return null;
    } catch (err) {
        console.error(`/services/seasons/create error: ${err.message}`);
        throw err;
    }
};

module.exports = { create };
