const Invoices = require('../models/Invoices');
const invoiceService = require('../services/invoices');
const userService = require('../services/users');

const pay = async (req, res, next) => {
    const { id } = req.params;
    const { paid_at } = req.body;

    const [invoice] = await Invoices.query()
        .where({ id })
        .patch({ paid_at })
        .returning('*');

    const locked = await invoiceService.handleLockedUser({
        users_id: invoice.users_id,
    });

    res.send({ locked });
};

const get = async (req, res, next) => {
    const { username } = req.params;

    if (!username) {
        const invoices = await Invoices.query();
        res.send(invoices);
    } else {
        const user = await userService.get({ username });
        const invoices = await invoiceService.get({ users_id: user.id });
        res.send(invoices);
    }
};

module.exports = {
    pay,
    get,
};
