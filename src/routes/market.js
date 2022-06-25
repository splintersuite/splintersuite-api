const express = require('express');
const market = require('../controllers/market');

const router = express.Router();

router.get('/current_prices', market.handleGetCurrentPrices);

module.exports = router;
