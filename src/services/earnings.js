import DailyEarnings from '../models/DailyEarnings';
import UserRentalListings from '../models/UserRentalListings';

const calcAggregatedEarnings = async ({ users_id }) => {
    const now = new Date();
    const firstOfTheMonth = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-01`
    );
    const firstOfTheYear = new Date(`${now.getFullYear()}-01-01`);

    const mtdRentals = await DailyEarnings.query()
        .where({
            users_id,
        })
        .whereBetween('timestamp', [firstOfTheMonth, now]);
    const ytdRentals = await DailyEarnings.query()
        .where({
            users_id,
        })
        .whereBetween('timestamp', [firstOfTheYear, now]);
};

const calcDailyEarnings = async ({ users_id }) => {
    const rentals = await UserRentalListings.query().where({
        users_id,
        rental_active_yn: 'Y',
    });

    return {
        numRentals: rentals.length,
        earnings: Math.sum(rentals.map(({ price }) => price)),
    };
};

// do we want dec_start?
const insertDailyEarnings = async ({ users_id }) => {
    const earningsData = await calcDailyEarnings({ users });
    await DailyEarnings.query().insert({
        users_id,
        timestamp: new Date(),
        earnings: earningsData.earnings,
        num_rentals: earningsData.numRentals,
    });
};

export default calcEarnings;
