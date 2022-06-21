const Users = require('../models/Users');
const earningsFncs = require('../services/earnings/earningsMetrics');

const createAndReturnUser = async ({ username }) => {
    const user = await Users.query().insert({
        username,
        locked: false,
    });
    return user;
};

const getUser = async ({ username }) => {
    const user = await Users.query().findOne({ username });

    return user;
};

const getUsersDataForFrontend = async ({ users_id }) => {
    const earningsObj = await earningsFncs.calcAggregatedEarnings({
        users_id,
    });
    return earningsObj;
};

module.exports = {
    createAndReturnUser,
    getUser,
    getUsersDataForFrontend,
};
