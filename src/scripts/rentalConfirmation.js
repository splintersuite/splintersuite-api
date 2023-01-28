'use strict';
const logger = require('../util/pinologger');
const rentalConfirmation = require('../services/rentalConfirmation');

const confirmEarnigsForUsers = async () => {
    try {
        logger.info(
            `/scripts/services/rentalConfirmation/confirmEarnigsForUsers`
        );

        // TNT NOTE: we shouldn't run the updateRentalsInDb with this or should we?  I think it doesnt make sense to because we want to keep the logs sperate imo, and don't need to confirm rentals first
        // with the invoice script though, should make sure confirm rentals are run
        // NOTE: WE DEFINITELY DO NEED TO RUN THE HIVE TX DATES function before this though!
        await rentalConfirmation.confirmRentalsForUsers();

        logger.info(
            `/scripts/services/rentalConfirmation/confirmEarnigsForUsers:`
        );
        process.exit(0);
    } catch (err) {
        logger.error(
            `/scripts/services/rentalConfirmation/confirmEarnigsForUsers error: ${err.message}`
        );
        throw err;
    }
};

confirmEarnigsForUsers();
