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
        console.log('/util/dates/getYesterdayAndTomorrow');
        const todayMS = new Date().getTime(); // ms aka 1000 ms per s
        const msInADay = 1000 * 60 * 60 * 24; // 86400 * 1000
        const yesterdayInMs = todayMS - msInADay;
        const tomorrowInMs = todayMS + msInADay;

        const yesterday = new Date(yesterdayInMs);
        const tomorrow = new Date(tomorrowInMs);
        return { yesterdayInMs, tomorrowInMs, yesterday, tomorrow };
    } catch (err) {
        console.error(`getYesterdayAndTomorrow error: ${err.message}`);
        throw err;
    }
};

const getOneDayAgo = ({ date }) => {
    try {
        console.log('/util/dates/getOneDayAgo');
        const dateInMs = new Date(date).getTime();
        const msInADay = 1000 * 60 * 60 * 24;
        const oneDayAgoInMS = dateInMs - msInADay;
        const oneDayAgo = new Date(oneDayAgoInMS);

        return { oneDayAgoInMS: parseInt(oneDayAgoInMS), oneDayAgo };
    } catch (err) {
        console.error(`getOneDayAgo error: ${err.message}`);
        throw err;
    }
};

const getNumDaysAgo = ({ numberOfDaysAgo }) => {
    try {
        console.log('/util/dates/getNumDaysAgo');
        const nowMs = new Date().getTime();
        const msInADay = 1000 * 60 * 60 * 24;
        const numOfDaysAgoMs = msInADay * numberOfDaysAgo;
        const msDaysAgo = nowMs - numOfDaysAgoMs;
        const daysAgo = new Date(msDaysAgo);
        console.log('/util/dates/getNumDaysAgo done');
        return { daysAgo, msDaysAgo: parseInt(msDaysAgo), nowMs };
    } catch (err) {
        console.error(`/util/dates/getNumDaysAgo error: ${err.message}`);
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
};
