const logger = require('../util/pinologger');
const Users = require('../models/Users');
const retryFncs = require('../util/axios_retry/general');
const cardDetails = require('../util/cardDetails.json');
// const rentalFncs = require('../services/rentals/allAccountUpdate');
const rentalFncs = require('../services/rentals/tntAllAccountUpdate');
const earningsService = require('../services/tntearnings');

// we should run this like
const calculateEarningsForUsers = async () => {
    try {
        logger.debug(`/scripts/earnings/calculateEarningsForUsers`);
        // runs at 0:00 EST and 12:00 PM EST
        const todaysDate = new Date(new Date().toISOString().split('T')[0]); // Mon Jun 27 2022 20:00:00 GMT-0400 (Eastern Daylight Time)
        const cardDetailsObj = {};
        cardDetails.forEach((card) => {
            cardDetailsObj[card.id] = card;
        });

        const users = await Users.query();
        let count = 0;
        const fiveMinutesInMS = 1000 * 60 * 5;
        for (const user of users) {
            // 100 users in a batch, then wait 5 minutes
            await rentalFncs
                .updateRentalsInDb({
                    username: user.username,
                    users_id: user.id,
                    cardDetailsObj,
                })
                .catch((err) => {
                    logger.error(`updateRentalsInDb error: ${err.message}`);
                    throw err;
                });
            if (count !== 0 && count % 100 === 0) {
                await retryFncs.sleep(fiveMinutesInMS);
            }
            await retryFncs.sleep(1000);
            count++;
        }

        // could split this in functions, w/e
        // calculate and insert (or patch) earnings
        for (const user of users) {
            await earningsService.get({ users_id: user.id }).catch((err) => {
                logger.error(`/services/tntearnings/get error: ${err.message}`);
                throw err;
            });
            // await earningsService
            //     .insertDailyEarnings({
            //         users_id: user.id,
            //         earnings_date: todaysDate,
            //     })
            //     .catch((err) => {
            //         logger.error(`insertDailyEarnings error: ${err.message}`);
            //         throw err;
            //     });
        }
        logger.info('calculateEarningsForUsers done');
        process.exit(0);
    } catch (err) {
        logger.error(`calculateEarningsForUsers error: ${err.message}`);
        throw err;
    }
};

calculateEarningsForUsers();
