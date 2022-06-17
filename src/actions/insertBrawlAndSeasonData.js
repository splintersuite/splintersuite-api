import Brawls from '../models/Brawls.js';
import Seasons from '../models/Seasons.js';

export const insertBrawl = async ({ brawlData }) => {
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

export const insertSeason = async ({ seasonData }) => {
    try {
        // console.log(`insertSeason start`);
        const { id, ends, name } = seasonData;

        const end_date = new Date(ends);
        await Seasons.query().insert({
            season_id: id,
            end_date,
            season_name: name,
        });
    } catch (err) {
        console.error(`insertSeason error: ${err.message}`);
        throw err;
    }
};

export const getMostRecentSeason = async () => {
    console.log('getMostRecentSeason start');
    // TNT IDEA; should we add a boolean to season being active/ended? Therefore we could search for most recent season that ended cuz otherwise it would get season in progress

    const season = await Seasons.query().orderBy('end_date', 'desc');

    return season;
};
