const rentalListingService = require('../services/rentalListings');

const addRentalListings = async (req, res, next) => {
    const { rentalListings } = req.body;
    if (rentalListings && rentalListings.length !== 0) {
        await rentalListingService.create({ rentalListings });
    }
    res.send('ok');
};

module.exports = { addRentalListings };
