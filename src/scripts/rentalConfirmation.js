'use strict';
const logger = require('../util/pinologger');
const rentalConfirmation = require('../services/rentalConfirmation');

const confirmEarnigsForUsers = async () => {
    try {
        const start = new Date();
        logger.info(
            `/scripts/services/rentalConfirmation/confirmEarnigsForUsers start: ${start}, startTime: ${start.getTime()}`
        );

        await rentalConfirmation.confirmRentalsForUsers();

        const end = new Date();
        logger.info(
            `/scripts/services/rentalConfirmation/confirmEarnigsForUsers: end: ${end}, endTime: ${end.getTime()}`
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
