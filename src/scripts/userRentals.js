'use strict';
const logger = require('../util/pinologger');
const userRentals = require('../services/userRentals');

const update = async () => {
    try {
        const start = new Date();
        logger.info(
            `/scripts/userRentals/update start: ${start}, startTime: ${start.getTime()}`
        );

        await userRentals.update();
        const end = new Date();
        logger.info(
            `/scripts/userRentals/update: end: ${end}, endTime: ${end.getTime()}`
        );
        process.exit(0);
    } catch (err) {
        logger.error(`/scripts/userRentals/update error: ${err.message}`);
        throw err;
    }
};

update();
