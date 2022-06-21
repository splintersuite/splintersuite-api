const _ = require('lodash');
const DailyEarnings = require('../../models/DailyEarnings');
const UserRentals = require('../../models/UserRentals');
const { SPLINTERSUITE_BOT } = require('../rentals/types');

const calcDailyEarnings = async ({ users_id }) => {
    // const rentals = await UserRentals.query().where({
    //     users_id,
    //     is_rental_active: true,
    // });

    const rentals = await UserRentals.query()
        .where('user_rentals.users_id', users_id)
        .where('user_rentals.is_rental_active', true)
        .join(
            'user_rental_listings',
            'user_rentals.user_rental_listing_id',
            'user_rental_listings.id'
        )
        .select('user_rentals.*', 'user_rental_listings.source');

    return {
        numRentals: rentals.length,
        earnings_dec: _.sum(rentals.map(({ price }) => price)),
        bot_earnings_dec: _.sum(
            rentals
                .filter(({ source }) => source === SPLINTERSUITE_BOT)
                .map(({ price }) => price)
        ),
    };
};

// NEEDS TO BE RUN ON A DAILY BASIS
const insertDailyEarnings = async ({ users_id, earnings_date }) => {
    const earningsData = await calcDailyEarnings({ users_id });

    await DailyEarnings.query().insert({
        users_id,
        earnings_date,
        earnings_dec: earningsData.earnings_dec,
        bot_earnings_dec: earningsData.bot_earnings_dec,
        num_rentals: earningsData.numRentals,
    });
};

module.exports = {
    insertDailyEarnings,
    calcDailyEarnings,
};
