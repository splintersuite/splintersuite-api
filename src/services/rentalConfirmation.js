'use strict';
const logger = require('../util/pinologger');
const Users = require('../models/Users');
const retryFncs = require('../util/axios_retry/general');
const cardDetails = require('../util/cardDetails.json');
const rentals = require('./rentals');

const confirmRentalsForUsers = async () => {
    try {
        logger.debug(`/services/rentalConfirmation/confirmRentalsForUsers`);
        const cardDetailsObj = {};
        cardDetails.forEach((card) => {
            cardDetailsObj[card.id] = card;
        });
        const users = await Users.query();
        let count = 0;
        const fiveMinutesInMS = 1000 * 60 * 5;
        for (const user of users) {
            await rentals
                .updateRentalsInDb({
                    username: user.username,
                    users_id: user.id,
                    cardDetailsObj,
                })
                .catch((err) => {
                    logger.error(
                        `/services/rentalConfirmation/confirmRentalsForUsers .updateRentalsInDb users_id: ${JSON.stringify(
                            user.id
                        )} error: ${err.message}`
                    );
                    throw err;
                });

            await rentals
                .patchRentalsBySplintersuite({
                    users_id: user.id,
                    username: user.username,
                })
                .catch((err) => {
                    logger.error(
                        `/services/rentalConfirmation/confirmRentalsForUsers .patchRentalsBySplintersuite users_id: ${JSON.stringify(
                            user.id
                        )} error: ${err.message}`
                    );
                    throw err;
                });
            if (count !== 0 && count % 100 === 0) {
                await retryFncs.sleep(fiveMinutesInMS);
            }
            await retryFncs.sleep(1000);
            count++;
        }
        logger.info(
            `/services/rentalConfirmation/confirmRentalsForUsers: for ${users?.length} users`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/rentalConfirmation/confirmRentalsForUsers error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    confirmRentalsForUsers,
};
