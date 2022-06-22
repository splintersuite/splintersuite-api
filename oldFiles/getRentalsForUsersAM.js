const Users = require('../src/models/Users');
const retryFncs = require('../src/services/axios_retry/general');
const cardDetails = require('../src/util/cardDetails.json');
const rentalFncs = require('../src/services/rentals/allAccountUpdate');
const logger = require('../src/util/pinologger');

const updateRentalsForUsers = async () => {
    try {
        logger.debug('updateRentalsForUsers start');
        // runs at 11:00 EST
        const cardDetailsObj = {};
        cardDetails.forEach((card) => {
            cardDetailsObj[card.id] = card;
        });

        const users = await Users.query();
        let count = 0;
        const fiveMinutesInMS = 1000 * 60 * 5;
        for (const user of users) {
            // 100 users in a batch, then wait 5 minutes
            await rentalFncs.updateRentalsInDb({
                username: user.username,
                users_id: user.id,
                cardDetailsObj,
            });
            if (count !== 0 && count % 100 === 0) {
                await retryFncs.sleep(fiveMinutesInMS);
            }
            await retryFncs.sleep(1000);
            count++;
        }
        logger.info('updateRentalsForUsers done');
        process.exit(0);
    } catch (err) {
        logger.error(`updateRentalsForUsers error: ${err.message}`);
        throw err;
    }
};

updateRentalsForUsers();
