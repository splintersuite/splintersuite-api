import express from 'express';

import Users from '../models/Users.js';
import { getUserInfo } from '../controllers/User.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const users = await Users.query();
    console.log(users);
    res.send(users);
});

router.get('/:username', getUserInfo);

    let [user] = await Users.query().where({ username });

    console.log('USER', user);
    console.log('-------------------------------------------');

    if (!user?.id) {
        const now = new Date();
        const users = await Users.query()
            .insert({
                username,
                created_at: now,
            })
            .returning('*');
        console.log(users);
        user = users[0];
    }

    console.log('USER 2', user);
    console.log('-------------------------------------------');

    const invoices = await Invoices.query()
        .join('seasons', { 'invoices.season_id': 'seasons.id' })
        .select('invoices.*', 'seasons.season_name')
        .where({ user_id: user.id });
    user.invoices = invoices || [];

    res.send(user);
});

router.get('/', async (req, res) => {
    const users = await Users.query();
    res.send(users);
});

export default router;
