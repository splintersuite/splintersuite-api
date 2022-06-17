import { createAndReturnUser, getUser } from '../actions/createAndGetUser';

export const getUserInfo = async (req, res, next) => {
    const { username } = req.params;
    let user = await getUser({ username });

    console.log('USER', user);
    console.log('-------------------------------------------');

    if (!user?.id) {
        user = await createAndReturnUser({ username });
    }

    console.log('USER 2', user);
    console.log('-------------------------------------------');

    res.send('success');
};
