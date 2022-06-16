import express from 'express';

import Invoices from '../models/Invoices.js';

const router = express.Router();

router.post('/:id', async (req, res, next) => {
    const { id } = req.params;
    const { paid_at } = req.body;

    await Invoices.query().where({ id }).update({ paid_at });

    res.sendStatus(200);
});

export default router;
