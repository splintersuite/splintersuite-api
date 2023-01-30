'use strict';
const logger = require('../util/pinologger');
const userRentalsService = require('../services/userRentals');

const update = async () => {
    try {
        logger.info(`/scripts/userRentals/update`);

        const timeSummary = await userRentalsService.update();

        logger.info(
            `/scripts/userRentals/update: timeSummary: ${JSON.stringify(
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
