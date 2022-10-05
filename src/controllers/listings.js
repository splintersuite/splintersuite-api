'use strict';
const userService = require('../services/users');

const get = async (req, res, next) => {
    const { username } = req.params;

    let user = await userService.get({ username });
};
