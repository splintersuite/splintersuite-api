import express from 'express';

import Users from '../models/Users.js';
import Invoices from '../models/Invoices.js';

const router = express.Router();

router.get('/:username', async (req, res) => {
    const { username } = req.params;

    const [user] = await Users.query().where({ username });
    const invoices = await Invoices.query()
        .join('seasons', { 'invoices.season_id': 'seasons.id' })
        .select('invoices.*', 'seasons.name')
        .where({ user_id: user.id });
    user.invoices = invoices;

    res.send(user);
});

router.get('/', async (req, res) => {
    const users = await Users.query();
    res.send(users);
});

export default router;
