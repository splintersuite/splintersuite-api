'use strict';
const logger = require('../util/pinologger');
const userRentalsService = require('../services/userRentals');
const utilDates = require(`../util/dates`);

const update = async () => {
    try {
        const start = new Date();
        const startTime = start.getTime();
        logger.info(
            `/scripts/userRentals/update start: ${start}, startTime: ${startTime}`
        );

        const timeSummary = await userRentalsService.update();
        const end = new Date();
        const endTime = end.getTime();
        const totalMinsLong = utilDates.computeMinsSinceStart({
            startTime,
            endTime,
        });

        logger.info(
            `/scripts/userRentals/update: end: ${end}, endTime: ${endTime}, totalMinsLong: ${totalMinsLong}, timeSummary: ${JSON.stringify(
                timeSummary
            )}`
        );
        process.exit(0);
    } catch (err) {
        logger.error(`/scripts/userRentals/update error: ${err.message}`);
        throw err;
    }
};

update();
