const DailyEarnings = require('../../models/DailyEarnings');
const UserRentals = require('../../models/UserRentals');
const _ = require('lodash');

const calcDailyEarnings = async ({ users_id }) => {
    const rentals = await UserRentals.query().where({
        users_id,
        is_rental_active: true,
    });

    return {
        numRentals: rentals.length,
        earnings: _.sum(rentals.map(({ price }) => price)),
    };
};

// NEEDS TO BE RUN ON A DAILY BASIS
const insertDailyEarnings = async ({ users_id, earnings_date }) => {
    const earningsData = await calcDailyEarnings({ users_id });

    await DailyEarnings.query().insert({
        users_id,
        earnings_date,
        earnings_dec: earningsData.earnings,
        num_rentals: earningsData.numRentals,
    });
};

module.exports = {
    insertDailyEarnings,
    calcDailyEarnings,
};
