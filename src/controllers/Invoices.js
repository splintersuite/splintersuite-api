import Invoices from '../models/Invoices.js';
import { getUser } from '../actions/createAndGetUser.js';
import { createInvoiceForUsersId } from '../actions/getAndCreateInvoices.js';

export const payInvoice = async (req, res, next) => {
    const { id } = req.params;
    const { paid_at } = req.body;
    const now = new Date();

    await Invoices.query().where({ id }).patch({
        paid_at: now,
    });

    res.send({ success: true });
};

export const createInvoice = async (req, res, next) => {
    const { username } = req.params;

    const user = await getUser({ username });
    const invoice = await createInvoiceForUsersId({ users_id: user.id });

    res.send(invoice);
};
