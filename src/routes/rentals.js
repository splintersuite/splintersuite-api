import express from 'express';
import Users from '../models/Users.js';

const router = express.Router();

router.post('/:username', async (req, res, next) => {
    const { username } = req.params;
    console.log('POST /rentals', username);
    console.log(req.body);
    res.send({ message: 'test' });
});

export default router;
