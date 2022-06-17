import dotenv from 'dotenv';
dotenv.config();

import Users from '../models/Users';

const insertUser = async ({ username }) => {
    const now = new Date();
    await Users.query()
        .insert({
            username,
            created_at: now,
        })
        .catch((err) => {
            console.log(err);
        });
};

// insertUser({ username: 'xdww' });

const queryJboxx = async () => {
    const users = await Users.query().catch((err) => {
        console.log(err);
    });

    console.log('users', users);
};

queryJboxx();

import UserRentalListings from '../models/UserRentalListings';

const activeRentals = await UserRentalListings.query().where({
    users_id,
    is_rental_active: true,
});

rentalIncomeHistory.forEach();
