const {
    createAndReturnUser,
    getUser,
    getUsersDataForFrontend,
} = require('../actions/createAndGetUser');

// const { getRecentSeasonInvoicesForUsersId }  = require('../actions/getAndCreateInvoices';

const getUserInfo = async (req, res, next) => {
    const { username } = req.params;
    let user = await getUser({ username });

    if (!user?.id) {
        [user] = await createAndReturnUser({ username });
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

module.exports = { getUserInfo };
