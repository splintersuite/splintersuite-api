import Users from '../models/Users.js';

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
