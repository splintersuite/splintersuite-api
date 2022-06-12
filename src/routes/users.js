import express from 'express';
import Users from '../models/Users.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const users = await Users.query();
    console.log(users);
    res.send(users);
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const user = await Users.query().where('id', id);
    console.log(user);
    res.send(user);
});

export default router;
