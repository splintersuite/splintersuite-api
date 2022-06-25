const logger = require('../util/pinologger');
const Users = require('../models/Users');
const earningsService = require('../services/earnings');

const create = async ({ username }) => {
    logger.debug('/services/users/create');
    const user = await Users.query().insert({
        username,
        locked: false,
    });
    return user;
};

const get = async ({ username }) => {
    logger.debug('/services/users/get');
    const user = await Users.query().findOne({ username });
    return user;
};

const getEarnings = async ({ users_id }) => {
    logger.debug('/services/users/getEarnings');
    const earningsObj = await earningsService.get({
        users_id,
    });
    return earningsObj;
};

module.exports = {
    create,
    get,
    getEarnings,
};
