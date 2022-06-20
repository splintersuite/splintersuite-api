const express = require('express');
const Users = require('../models/Users');

const router = express.Router();

router.post('/:username', async (req, res, next) => {
    const { username } = req.params;
    res.send({ message: 'test' });
});

module.exports = router;
