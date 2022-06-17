import Invoices from '../models/Invoices.js';

export const payInvoice = async (req, res, next) => {
    const { id } = req.params;
    const { paid_at } = req.body;

    await Invoices.query().where({ id }).update({ paid_at });

    res.send('Your invoice is confirmed as paid off');
};
