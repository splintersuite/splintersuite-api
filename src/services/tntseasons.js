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
            const lastSeason = await getLastEnteredSeason({
                new_season_id: id,
            });

            const newSeason = await Seasons.query()
                .insert({
                    season_id: id,
                    start_date: new Date(lastSeason.end_date),
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

            logger.info(`/services/seasons/create`);
            return newSeason;
        } else {
            throw new Error('missing season data');
        }
    } catch (err) {
        console.error(`/services/seasons/create error: ${err.message}`);
        throw err;
    }
};

const getLastEnteredSeason = async ({ new_season_id }) => {
    try {
        logger.debug(`/src/srvices/seasons/getLastEnteredSeason`);
        const oldId = new_season_id - 1;
        const oldSeason = await Seasons.query().findOne({
            season_id: oldId,
        });
        logger.debug(
            `oldSeason: ${JSON.stringify(oldSeason)}, oldId: ${oldId}`
        );
        if (oldSeason) {
            const nowTime = new Date().getTime();
            if (oldSeason.end_date.getTime() < nowTime) {
                logger.debug(
                    `/src/srvices/seasons/getLastEnteredSeason with oldSeason: ${JSON.stringify(
                        oldSeason
                    )}`
                );
                return oldSeason;
            }
        } else {
            logger.debug(
                `/src/srvices/seasons/getLastEnteredSeason done no oldSeason`
            );
            return null;
        }
    } catch (err) {
        logger.error(
            `/src/srvices/seasons/getLastEnteredSeason error: ${err.message}`
        );
        throw err;
    }
};

module.exports = { create };
