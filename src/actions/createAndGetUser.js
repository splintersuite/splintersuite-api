import Users from '../models/Users.js';

export const createAndReturnUser = async ({ username }) => {
    console.log('createUser start');
    //const now = new Date();
    const user = await Users.query().insert({
        username,
    });
    console.log('user is: ');
    console.log(user);
    return user;
};

export const getUser = async ({ username }) => {
    console.log('getUser start');
    const user = await Users.query().findOne({ username });

    return user;
};
