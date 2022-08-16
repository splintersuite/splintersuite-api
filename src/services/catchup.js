'use strict';
const logger = require('../util/pinologger');
const splinterlandsService = require('./splinterlands');
const rentalService = require('./rentals');
const retryFncs = require('../util/axios_retry/general');

const getAllActiveRentals = async ({ username, last_rental_in_db }) => {
    try {
        logger.debug(`/services/catchup/getAllActiveRentals`);

        let lastDate;

        let length = 1;
        let offset = 0;
        const fiveMinutesInMS = 1000 * 60 * 5;
        const totalRentals = [];
        while (length > 0) {
            const rentals = await splinterlandsService.getActiveRentalsRange({
                username,
                offset,
            });

            if (rentals?.length > 0) {
                logger.debug(
                    `another loop, got back data with length: ${rentals.length}, and offset of : ${offset} for user: ${username}`
                );
                totalRentals.push(...rentals);
                length = rentals.length;
            } else if (rentals?.length === 0) {
                logger.debug(`ending this`);
                length = 0;
            }

            offset = offset + 200;

            if (offset % 1000 === 0) {
                await retryFncs.sleep(fiveMinutesInMS);
            }
        }

        logger.debug(`totalRentals length is: ${totalRentals?.length}`);

        return totalRentals;
    } catch (err) {
        logger.error(
            `/services/catchup/getAllActiveRentals error: ${err.message}`
        );
        throw err;
    }
};

getAllActiveRentals({ username: 'xdww' });
