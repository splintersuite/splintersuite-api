const express = require('express');
const invoices = require('../controllers/invoices');

const router = express.Router();

router.post('/:id', invoices.pay);
router.get('/:username', invoices.get);

module.exports = router;
