const express = require('express');

const rentalListings = require('../controllers/rentalListings');

const router = express.Router();

router.post(`/newrentallistings`, rentalListings.addRentalListings);

module.exports = router;
