const express = require('express');
const { addRentalListings } = require('../controllers/RentalListings');
const router = express.Router();

router.post(`/newrentallistings`, addRentalListings);

module.exports = router;
