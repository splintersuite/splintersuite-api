import DailyEarnings from '../../models/DailyEarnings';
import UserRentals from '../../models/UserRentals';

const calcDailyEarnings = async ({ users_id }) => {
    const rentals = await UserRentals.query().where({
        users_id,
        is_rental_active: true,
    });

    return {
        numRentals: rentals.length,
        earnings: Math.sum(rentals.map(({ price }) => price)),
    };
};

// NEEDS TO BE RUN ON A DAILY BASIS
const insertDailyEarnings = async ({ users_id }) => {
    const earningsData = await calcDailyEarnings({ users });
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
