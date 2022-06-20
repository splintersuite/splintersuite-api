const Invoices = require('../models/Invoices');
const { getUser } = require('../actions/createAndGetUser');
const {
    createInvoiceForUsersId,
    getInvoicesForUser,
} = require('../actions/getAndCreateInvoices');
const { handleLockedUser } = require('../actions/invoices');

const payInvoice = async (req, res, next) => {
    const { id } = req.params;
    const { paid_at } = req.body;

    const invoice = await Invoices.query()
        .where({ id })
        .patch({ paid_at })
        .returning('*');

    const locked = await handleLockedUser({ users_id: invoice.users_id });

    // return whether or not the user is locked out
    res.send({ locked });
};

const createInvoice = async (req, res, next) => {
    const { username } = req.params;

    const user = await getUser({ username });
    const invoice = await createInvoiceForUsersId({ users_id: user.id });

    res.send(invoice);
};

const getInvoices = async (req, res, next) => {
    const { username } = req.params;

    if (!username) {
        const invoices = await Invoices.query();
        res.send(invoices);
    } else {
        const user = await getUser({ username });
        const invoices = await getInvoicesForUser({ users_id: user.id });
        res.send(invoices);
    }
};

module.exports = {
    payInvoice,
    createInvoice,
    getInvoices,
};
