const express = require('express');
const { payInvoice, getInvoices } = require('../controllers/Invoices');

const router = express.Router();

router.post('/:id', payInvoice);

router.get('/:username', getInvoices);

module.exports = router;
