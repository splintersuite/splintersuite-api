'use strict';
const logger = require('../util/pinologger');
const Users = require('../models/Users');
const retryFncs = require('../util/axios_retry/general');
const cardDetails = require('../util/cardDetails.json');
const catchupService = require('../services/catchup');

const calculateAllEarningsForUsers = async () => {
    try {
        logger.debug(`/scripts/catchup/calculateAllEarningsForUsers`);
        const cardDetailsObj = {};
        cardDetails.forEach((card) => {
            cardDetailsObj[card.id] = card;
        });

        const users = await Users.query();
        let count = 0;
        const fiveMinutesInMS = 1000 * 60 * 5;
        for (const user of users) {
            logger.info(
                `/scripts/catchup/calculateAllEarningsForUsers User: ${JSON.stringify(
                    user
                )}`
            );

            // 5 users in a bitch, then wait a minute
            await catchupService.updateAllRentalsInDb({
                username: user.username,
                users_id: user.id,
                cardDetailsObj,
            });

            if (count !== 0 && count % 100 === 0) {
                await retryFncs.sleep(fiveMinutesInMS);
            }
            await retryFncs.sleep(5000);
            count++;
        }

        logger.info(`/scripts/catchup/calculateAllEarningsForUsers`);
        process.exit(0);
    } catch (err) {
        logger.error(
            `/scripts/catchup/calculateAllEarningsForUsers error: ${err.message}`
        );
        throw err;
    }
};

// calculateAllEarningsForUsers();

/*

{"level":30,"time":"2022-08-26T04:28:27.454Z","pid":32431,"hostname":"Trevors-Mac-mini.local","msg":"activeRentals.length at end: 774"}
{"level":30,"time":"2022-08-26T04:28:27.454Z","pid":32431,"hostname":"Trevors-Mac-mini.local","msg":"cleanedActiveRentals.length at end: 774"}
{"level":30,"time":"2022-08-26T04:28:27.454Z","pid":32431,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentals/allAccountUpdate/cleanAPIActiveRentalsdone"}
{"level":50,"time":"2022-08-26T04:28:27.454Z","pid":32431,"hostname":"Trevors-Mac-mini.local","msg":"/services/catchup/updateAllRentalsInDb error: last_rental_in_db is not defined"}
{"level":50,"time":"2022-08-26T04:28:27.454Z","pid":32431,"hostname":"Trevors-Mac-mini.local","msg":"/scripts/catchup/calculateAllEarningsForUsers error: last_rental_in_db is not defined"}

*/
