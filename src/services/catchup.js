'use strict';
const UserRentals = require('../models/UserRentals');
const logger = require('../util/pinologger');
const splinterlandsService = require('./splinterlands');
const rentalsService = require('./rentals');
const retryFncs = require('../util/axios_retry/general');

// returns array
const getAllActiveRentals = async ({ username, last_DB_rental_date }) => {
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
                logger.info(`sleeping for 5 mins to avoid rate limit`);
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

const getActiveRentalsInDBForRange = async ({
    users_id,
    last_rental_in_db,
}) => {
    try {
        logger.debug(`/services/catchup/getActiveRentalsInDBForRange`);

        const now = new Date();

        const dbActiveRentals = await UserRentals.query()
            .where({ users_id })
            .whereBetween('last_rental_payment', [last_rental_in_db, now])
            .catch((err) => {
                logger.error(
                    `/services/catchup/getActiveRentalsInDBForRange UserRentals query with users_id: ${users_id}, now: ${now}, and last_rental_in_db: ${last_rental_in_db}, error: ${err.message}`
                );
                throw err;
            });

        logger.debug(`/services/catchup/getActiveRentalsInDBForRange`);
    } catch (err) {
        logger.error(
            `/services/catchup/getActiveRentalsInDBForRange error: ${err.message}`
        );
        throw err;
    }
};

const updateAllRentalsInDb = async ({
    username,
    users_id,
    last_DB_rental_date,
    cardDetailsObj,
}) => {
    try {
        logger.debug(`/services/catchup/updateAllRentalsInDb`);

        const activeRentals = await getAllActiveRentals({ username });

        const newActiveRentals = rentalsService.cleanAPIActiveRentals({
            activeRentals,
        });

        const dbRentalsForRange = await getActiveRentalsInDBForRange({
            users_id,
            last_DB_rental_date,
        });

        const dbRentalsByUid = rentalsService.searchableDBRentals({
            rentals: dbRentalsForRange,
        });

        logger.info(
            `dbRentalsForRange.length: ${JSON.stringify(
                dbRentalsForRange?.length
            )}`
        );
        logger.info(
            `Object.keys(dbRentalsByUid.length: ${JSON.stringify(
                Object.keys(dbRentalsByUid)?.length
            )}`
        );
        logger.info(`activeRentals.length : ${activeRentals?.length}`);
        loggerin.info(`newActiveRentals.lnegth: ${newActiveRentals?.length}`);
        throw new Error('checking the lengths');
        const { rentalsToInsert, rentalsAlreadyInserted } =
            rentalsService.filterIfInDB({
                newActiveRentals,
                dbRentalsByUid,
                users_id,
                cardDetailsObj,
            });

        await rentalsService.insertActiveRentals({ rentals: rentalsToInsert });

        logger.info(
            `/services/catchup/updateAllRentalsInDb done for user: ${username}`
        );

        return;
    } catch (err) {
        logger.error(
            `/services/catchup/updateAllRentalsInDb error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    updateAllRentalsInDb,
};
