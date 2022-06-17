import { createAndReturnUser, getUser } from '../actions/createAndGetUser.js';
import { getRecentSeasonInvoicesForUsersId } from '../actions/getAndCreateInvoices.js';

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

    // const invoices = await getRecentSeasonInvoicesForUsersId({
    //     users_id: user.id,
    // });
    // user.invoices = invoices || [];
    res.send(user);
};
