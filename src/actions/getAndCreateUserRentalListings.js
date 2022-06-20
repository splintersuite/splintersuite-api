const UserRentalListings = require('../models/UserRentalListings');
const _ = require('lodash');

const createNewRentalListings = async ({
    // users_id,
    rentalListings,
}) => {
    rentalListings.forEach((rentalListing) => {
        rentalListing.sl_created_at = new Date(rentalListing.sl_created_at);
    });

    let chunks = rentalListings;

    if (rentalListings.length > 1000) {
        chunks = _.chunk(rentalListingss, 1000);
    }

    if (chunks.length === rentalListings.length) {
        chunks = [chunks];
    }
    for (const transChunk of chunks) {
        await UserRentalListings.query().insert(transChunk);
    }

    return;
};

module.exports = { createNewRentalListings };
