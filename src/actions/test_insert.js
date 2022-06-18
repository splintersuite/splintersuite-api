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

const patcbUser = async ({ username }) => {
    const now = new Date();
    await Users.query()
        .where({ username })
        .patch({
            username: 'wtf',
        })
        .catch((err) => {
            console.log(err);
        });
};

// insertUser({ username: 'genepoolcardlord' });

const queryJboxx = async () => {
    const users = await Users.query().catch((err) => {
        console.log(err);
    });

    console.log('users', users);
};

// queryJboxx();
