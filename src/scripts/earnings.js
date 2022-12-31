'use strict';
const logger = require('../util/pinologger');
const Users = require('../models/Users');
const retryFncs = require('../util/axios_retry/general');
const cardDetails = require('../util/cardDetails.json');
const rentals = require('../services/rentals');
const earningsService = require('../services/earnings');
const rentalConfirmation = require('../services/rentalConfirmation');
const userRentalsService = require('../services/userRentals');

const calculateEarningsForUsers = async () => {
    try {
        const start = new Date();
        logger.info(
            `/scripts/earnings/calculateEarningsForUsers start: ${start}, startTime: ${start.getTime()}`
        );

        await userRentalsService.update();
        // const cardDetailsObj = {};
        // cardDetails.forEach((card) => {
        //     cardDetailsObj[card.id] = card;
        // });

        //  const users = await Users.query();
        // let count = 0;
        // const fiveMinutesInMS = 1000 * 60 * 5;
        // for (const user of users) {
        //     // 100 users in a batch, then wait 5 minutes
        //     await rentals
        //         .updateRentalsInDb({
        //             username: user.username,
        //             users_id: user.id,
        //             cardDetailsObj,
        //         })
        //         .catch((err) => {
        //             logger.error(
        //                 `/scripts/earnings/calculateEarningsForUsers .updateRentalsInDb users_id: ${JSON.stringify(
        //                     user.id
        //                 )} error: ${err.message}`
        //             );
        //             throw err;
        //         });
        //     await rentals
        //         .patchRentalsBySplintersuite({
        //             users_id: user.id,
        //             username: user.username,
        //         })
        //         .catch((err) => {
        //             logger.error(
        //                 `/scripts/earnings/calculateEarningsForUsers .patchRentalsBySplintersuite users_id: ${JSON.stringify(
        //                     user.id
        //                 )} error: ${err.message}`
        //             );
        //             throw err;
        //         });
        //     if (count !== 0 && count % 100 === 0) {
        //         await retryFncs.sleep(fiveMinutesInMS);
        //     }
        //     await retryFncs.sleep(1000);
        //     count++;
        // }
        await rentalConfirmation.confirmRentalsForUsers();
        for (const user of users) {
            await earningsService.insertAllDailyEarnings({
                users_id: user.id,
                created_at: user.created_at,
            });
        }
        const end = new Date();
        logger.info(
            `/scripts/earnings/calculateEarningsForUsers end: ${end}, endTime: ${end.getTime()}`
        );
        process.exit(0);
    } catch (err) {
        logger.error(
            `/scripts/earnings/calculateEarningsForUsers error: ${err.message}`
        );
        throw err;
    }
};

calculateEarningsForUsers();
