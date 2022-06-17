import axiosInstance from '../util/axiosInstance.js';
import {
    insertBrawl,
    insertSeason,
} from '../actions/insertBrawlAndSeasonData.js';
//
const getSplinterlandsSettings = async () => {
    try {
        // console.log('getSplinterlandsSettings start');

        const url = 'https://api2.splinterlands.com/settings';

        const res = await axiosInstance(url);

        const data = res.data;

        return data;
    } catch (err) {
        console.error(`getSplinterlandsSettings error: ${err.message}`);
        throw err;
    }
};

const getSLSeasonData = (settings) => {
    try {
        //console.log(`getSLSeasonData start`);

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
        //console.log(`getSLBrawlData start`);

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
export const getSLSeasonAndBrawlData = async () => {
    try {
        //  console.log('getSLSeasonData start');

        const data = await getSplinterlandsSettings();

        const seasonData = getSLSeasonData(data);

        const brawlData = getSLBrawlData(data);

        await insertBrawl({ brawlData });

        await insertSeason({ seasonData });

        return;
    } catch (err) {
        console.error(`getSLSeasonData error: ${err.message}`);
        throw err;
    }
};

getSLSeasonAndBrawlData();
