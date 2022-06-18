import Invoices from '../models/Invoices.js';
import { getUser } from '../actions/createAndGetUser.js';
import {
    createInvoiceForUsersId,
    getInvoicesForUser,
} from '../actions/getAndCreateInvoices.js';

export const payInvoice = async (req, res, next) => {
    const { id } = req.params;
    const { paid_at } = req.body;

    await Invoices.query().where({ id }).update({ paid_at });

    res.send('Your invoice is confirmed as paid off');
};

export const createInvoice = async (req, res, next) => {
    const { username } = req.params;

    const user = await getUser({ username });
    const invoice = await createInvoiceForUsersId({ users_id: user.id });

    res.send(invoice);
};

export const getInvoices = async (req, res, next) => {
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
