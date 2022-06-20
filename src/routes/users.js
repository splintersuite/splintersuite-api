const express = require('express');
const Users = require('../models/Users');
const { getUserInfo } = require('../controllers/User');

const router = express.Router();

router.get('/', async (req, res) => {
    const users = await Users.query();

    res.send(users);
});

router.get('/:username', getUserInfo);

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const user = await Users.query().where('id', id);

    res.send(user);
});

module.exports = router;
