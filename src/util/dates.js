const logger = require('./pinologger');

const { DateTime } = require('luxon');

const firstDayOfWeek = (dateObject, firstDayOfWeekIndex) => {
    const dayOfWeek = dateObject.getDay(),
        firstDayOfWeek = new Date(dateObject),
        diff =
            dayOfWeek >= firstDayOfWeekIndex
                ? dayOfWeek - firstDayOfWeekIndex
                : 6 - dayOfWeek;

    firstDayOfWeek.setDate(dateObject.getDate() - diff);
    firstDayOfWeek.setHours(0, 0, 0, 0);

    return firstDayOfWeek;
};

const getLastWeek = () => {
    const today = new Date();
    const lastWeek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 7
    );
    return lastWeek;
};

const dateRange = (startDate, endDate, steps = 1) => {
    const dateArray = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
        dateArray.push(new Date(currentDate));
        // Use UTC date to prevent problems with time zones and DST
        currentDate.setUTCDate(currentDate.getUTCDate() + steps);
    }

    return dateArray;
};

const getYesterdayAndTomorrow = () => {
    try {
        logger.debug('/util/dates/getYesterdayAndTomorrow');

        const todayMS = new Date().getTime(); // ms aka 1000 ms per s
        const msInADay = 1000 * 60 * 60 * 24; // 86400 * 1000
        const yesterdayInMs = todayMS - msInADay;
        const tomorrowInMs = todayMS + msInADay;

        const yesterday = new Date(yesterdayInMs);
        const tomorrow = new Date(tomorrowInMs);

        logger.debug('/util/dates/getYesterdayAndTomorrow done');
        return { yesterdayInMs, tomorrowInMs, yesterday, tomorrow };
    } catch (err) {
        console.error(`getYesterdayAndTomorrow error: ${err.message}`);
        throw err;
    }
};

const getOneDayAgo = ({ date }) => {
    try {
        logger.debug('/util/dates/getOneDayAgo');

        const dateInMs = new Date(date).getTime();
        const msInADay = 1000 * 60 * 60 * 24;
        const oneDayAgoInMS = dateInMs - msInADay;
        const oneDayAgo = new Date(oneDayAgoInMS);
        logger.debug(`/util/dates/getOneDayAgo done`);
        return { oneDayAgoInMS: parseInt(oneDayAgoInMS), oneDayAgo };
    } catch (err) {
        console.error(`getOneDayAgo error: ${err.message}`);
        throw err;
    }
};

const getNumDaysAgo = ({ numberOfDaysAgo, date }) => {
    try {
        logger.debug('/util/dates/getNumDaysAgo');

        const nowMs = date.getTime();
        const msInADay = 1000 * 60 * 60 * 24;
        const numOfDaysAgoMs = msInADay * numberOfDaysAgo;
        const msDaysAgo = nowMs - parseInt(numOfDaysAgoMs);
        const daysAgo = new Date(msDaysAgo);

        logger.debug('/util/dates/getNumDaysAgo done');
        return { daysAgo, msDaysAgo: parseInt(msDaysAgo) };
    } catch (err) {
        console.error(`/util/dates/getNumDaysAgo error: ${err.message}`);
        throw err;
    }
};

const getNumDaysFromNow = ({ numberOfDaysFromNow }) => {
    try {
        logger.debug(`/util/dates/getNumDaysFromNow`);

        const nowMs = new Date.getTime();
        const msInADay = 1000 * 60 * 60 * 24;
        const numOfDaysMs = msInADay * numberOfDaysFromNow;
        const msDaysFromNow = nowMS + parseInt(numOfDaysMs);
        const daysFromNow = new Date(msDaysFromNow);

        logger.debug(`/util/dates/getNumDaysFromNow done`);
        return { daysFromNow, msDaysFromNow: parseInt(msDaysFromNow) };
    } catch (err) {
        logger.error(`/util/dates/getNumDaysFromNow error: ${err.message}`);
        throw err;
    }
};
module.exports = {
    firstDayOfWeek,
    getLastWeek,
    dateRange,
    getYesterdayAndTomorrow,
    getOneDayAgo,
    getNumDaysAgo,
    getNumDaysFromNow,
};
