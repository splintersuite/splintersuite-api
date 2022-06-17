import dotenv from 'dotenv';
dotenv.config();

import Users from '../models/Users.js';
import Seasons from '../models/Seasons.js';
import Invoices from '../models/Invoices.js';

const insertUser = async ({ username }) => {
    const now = new Date();
    const res = await Users.query()
        .insert({
            username,
            created_at: now,
        })
        .catch((err) => {
            console.log(err);
        });
    console.log(res);
};

// insertUser({ username: 'chigginn' });

const insertSeason = async () => {
    const now = new Date();
    const res = await Seasons.query()
        .insert({
            name: 'My Test Season',
            start_date: now,
            end_date: now,
        })
        .catch((err) => {
            console.log(err);
        });
    console.log(res);
};

// insertSeason();

const insertInvoice = async () => {
    const now = new Date();
    const res = await Invoices.query()
        .insert({
            season_id: 'c646d3e0-077d-428b-97ed-cbd27bd896c6',
            user_id: '3683926e-e303-4fc0-b1ea-ad502ed076ca',
            discounted_due_at: now,
            due_at: now,
            amount_due: 1,
        })
        .catch((err) => {
            console.log(err);
        });
    console.log(res);
};

// insertInvoice();

const queryJboxx = async () => {
    const users = await Users.query().catch((err) => {
        console.log(err);
    });

    console.log('users', users);
};

// queryJboxx();
