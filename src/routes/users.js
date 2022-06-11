import express from 'express';

import User from '../models/User.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const users = await User.query();
    console.log(users);
    res.send(users);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const user = await User.query().where('id', id);
    console.log(user);
    res.send(user);
});

export default router;
