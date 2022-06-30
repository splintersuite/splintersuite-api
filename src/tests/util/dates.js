'use strict';

const utilDates = require('../../util/dates');

const testGetNumDaysAgo = () => {
    try {
        console.log(`testGetNumDaysAgo start`);

        const oneDay = 1;
        const oneAndAHalfDays = 1.5;
        const twoDays = 2;

        const now = new Date();

        const one = utilDates.getNumDaysAgo({
            numberOfDaysAgo: oneDay,
            date: now,
        });

        const oneAndAHalf = utilDates.getNumDaysAgo({
            numberOfDaysAgo: oneAndAHalfDays,
            date: now,
        });

        const two = utilDates.getNumDaysAgo({
            numberOfDaysAgo: twoDays,
            date: now,
        });

        console.log(`one: ${JSON.stringify(one)}`);
        console.log(`oneAndAHalf: ${JSON.stringify(oneAndAHalf)}`);
        console.log(`two: ${JSON.stringify(two)}`);
        return;
    } catch (err) {
        console.error(`testGetNumDaysAgo error: ${err.message}`);
        throw err;
    }
};

testGetNumDaysAgo();
// const getNumDaysAgo = ({ numberOfDaysAgo, date }) => {
