const express = require('express');
const invoices = require('../controllers/invoices');

const router = express.Router();

router.post('/:id', invoices.get);
router.get('/:username', invoices.pay);

module.exports = router;
