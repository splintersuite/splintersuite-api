const Brawls = require('../models/Brawls');
const Seasons = require('../models/Seasons');

const insertBrawl = async ({ brawlData }) => {
    try {
        //  console.log(`insertBrawl start`);

        const { id, start, end, name } = brawlData;

        const start_date = new Date(start);
        const end_date = new Date(end);
        await Brawls.query().insert({
            brawl_id: id,
            start_date,
            end_date,
            name,
        });
        return;
    } catch (err) {
        console.error(`insertBrawl error: ${err.message}`);
        throw err;
    }
};

const insertSeason = async ({ seasonData }) => {
    try {
        // console.log(`insertSeason start`);
        const { id, ends, name } = seasonData;

        const dbSeason = await Seasons.query().findOne({
            season_id: id,
            season_name: name,
        });

        const now = new Date();
        if (!dbSeason && now.getTime() > dbSeason.end_date.getTime()) {
            const newSeason = await Seasons.query().insert({
                season_id: id,
                end_date: new Date(ends),
                season_name: name,
            });

            return newSeason;
        }
        return null;
    } catch (err) {
        console.error(`insertSeason error: ${err.message}`);
        throw err;
    }
};

const getMostRecentSeason = async () => {
    // TNT IDEA; should we add a boolean to season being active/ended? Therefore we could search for most recent season that ended cuz otherwise it would get season in progress

    const season = await Seasons.query().orderBy('end_date', 'desc');
    return season[0];
};

module.exports = {
    insertBrawl,
    insertSeason,
    getMostRecentSeason,
};
