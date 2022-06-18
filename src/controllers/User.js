import {
    createAndReturnUser,
    getUser,
    getUsersDataForFrontend,
} from '../actions/createAndGetUser';

// import { getRecentSeasonInvoicesForUsersId } from '../actions/getAndCreateInvoices';

export const getUserInfo = async (req, res, next) => {
    const { username } = req.params;
    let user = await getUser({ username });

    if (!user?.id) {
        user = await createAndReturnUser({ username });
    }

    const earningsObj = await getUsersDataForFrontend({
        users_id: user.id,
    });
    user.stats = earningsObj;

    // const invoices = await getRecentSeasonInvoicesForUsersId({
    //     users_id: user.id,
    // });
    // user.invoices = invoices || [];
    res.send(user);
};
