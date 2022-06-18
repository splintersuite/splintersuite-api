import DailyEarnings from '../../models/DailyEarnings.js';
import UserRentals from '../../models/UserRentals.js';
import _ from 'lodash';

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
const insertDailyEarnings = async ({ users_id }) => {
    const earningsData = await calcDailyEarnings({ users_id });

    await DailyEarnings.query().insert({
        users_id,
        timestamp: new Date(),
        earnings: earningsData.earnings,
        num_rentals: earningsData.numRentals,
    });
};

export default {
    insertDailyEarnings,
    calcDailyEarnings,
};
