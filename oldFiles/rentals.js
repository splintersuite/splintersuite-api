const Users = require('../src/models/Users');
const earningsFncs = require('../src/services/earnings/calcEarnings');
const retryFncs = require('../src/services/axios_retry/general');
const cardFncs = require('../src/actions/getCardDetails');
const rentalFncs = require('../src/services/rentals/allAccountUpdate');

const updateRentalsForUsersMorning = async () => {
    // runs at 11:00 EST
    const cardDetails = await cardFncs.getCardDetail();
    const cardDetailsObj = {};
    cardDetails.forEach((card) => {
        cardDetailsObj[card.id] = card;
    });

    const users = await Users.query();
    let count = 0;
    const fiveMinutesInMS = 1000 * 60 * 5;
    for (const user of users) {
        // 100 users in a batch, then wait 5 minutes
        await rentalFncs.updateRentalsInDb({
            username: user.username,
            users_id: user.id,
            cardDetailsObj,
        });
        if (count !== 0 && count % 100 === 0) {
            await retryFncs.sleep(fiveMinutesInMS);
        }
        await retryFncs.sleep(1000);
        count++;
    }
};

const updateRentalsForUsersEvening = async () => {
    // runs at 23:00 EST
    const todaysDate = new Date(new Date().toISOString().split('T')[0]);
    const cardDetails = await cardFncs.getCardDetail();
    const cardDetailsObj = {};
    cardDetails.forEach((card) => {
        cardDetailsObj[card.id] = card;
    });

    const users = await Users.query();
    let count = 0;
    const fiveMinutesInMS = 1000 * 60 * 5;
    for (const user of users) {
        // 100 users in a batch, then wait 5 minutes
        await rentalFncs.updateRentalsInDb({
            username: user.username,
            users_id: user.id,
            cardDetailsObj,
        });
        if (count !== 0 && count % 100 === 0) {
            await retryFncs.sleep(fiveMinutesInMS);
        }
        await retryFncs.sleep(1000);
        count++;
    }

    // could split this in functions, w/e
    // calculate and insert earnings
    for (const user of users) {
        await earningsFncs.insertDailyEarnings({
            users_id: user.id,
            earnings_date: todaysDate,
        });
    }
};

const rentalWhenToRunMorning = '* 11 * * *';
const rentalWhenToRunEvening = '* 23 * * *';

const rentalOptions = {
    scheduled: true,
    timezone: 'America/New_York',
};

module.exports = {
    updateRentalsForUsersMorning,
    updateRentalsForUsersEvening,
    rentalWhenToRunMorning,
    rentalWhenToRunEvening,
    rentalOptions,
};
