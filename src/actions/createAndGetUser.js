import Users from '../models/Users.js';
import earningsFncs from '../services/earnings/earningsMetrics.js';

export const createAndReturnUser = async ({ username }) => {
    //const now = new Date();
    const user = await Users.query().insert({
        username,
    });
    return user;
};

export const getUser = async ({ username }) => {
    const user = await Users.query().findOne({ username });

    return user;
};

export const getUsersDataForFrontend = async ({ users_id }) => {
    const earningsObj = await earningsFncs.calcAggregatedEarnings({
        users_id,
    });
    return earningsObj;
};
