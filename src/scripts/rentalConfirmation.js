'use strict';
const logger = require('../util/pinologger');
const rentalConfirmation = require('../services/rentalConfirmation');
const utilDates = require(`../util/dates`);

const confirmEarnigsForUsers = async () => {
    try {
        const start = new Date();
        const startTime = start.getTime();
        logger.info(
            `/scripts/services/rentalConfirmation/confirmEarnigsForUsers start: ${start}, startTime: ${start.getTime()}`
        );

        const timeSummary = await rentalConfirmation.confirmRentalsForUsers();

        const end = new Date();
        const endTime = end.getTime();
        const totalMinsLong = utilDates.computeMinsSinceStart({
            startTime,
            endTime,
        });
        logger.info(
            `/scripts/services/rentalConfirmation/confirmEarnigsForUsers: totalMinsLong: ${totalMinsLong}, timeSummary: ${JSON.stringify(
                timeSummary
            )}`
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
