const _ = require('lodash');
const DailyEarnings = require('../../models/DailyEarnings');
const UserRentals = require('../../models/UserRentals');
const { SPLINTERSUITE_BOT, SPLINTERLANDS_API } = require('../rentals/types');

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

    const botRentals = rentals.filter(
        ({ source }) => source === SPLINTERSUITE_BOT
    );
    return {
        bot_num_rentals: botRentals.length,
        bot_earnings_dec: _.sum(botRentals.map(({ price }) => price)),
        num_rentals: rentals.length,
        earnings_dec: _.sum(rentals.map(({ price }) => price)),
    };
};

// NEEDS TO BE RUN ON A DAILY BASIS
const insertDailyEarnings = async ({ users_id, earnings_date }) => {
    const earningsData = await calcDailyEarnings({ users_id });

    await DailyEarnings.query().insert({
        users_id,
        earnings_date,
        earnings_dec: earningsData.earnings_dec,
        num_rentals: earningsData.num_rentals,
        bot_earnings_dec: earningsData.bot_earnings_dec,
        bot_num_rentals: earningsData.bot_num_rentals,
    });
};

module.exports = {
    insertDailyEarnings,
    calcDailyEarnings,
};
