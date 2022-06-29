'use strict';
const _ = require('lodash');
const UserRentalListings = require('../../models/UserRentalListings');
const UserRentals = require('../../models/UserRentals');
const logger = require('../../util/pinologger');
const splinterlandsService = require('../../services/splinterlands');
const utilDates = require('../../util/dates');

const updateRentalsInDB = async ({ username, users_id, cardDetailsObj }) => {
    try {
        logger.debug('/services/rentals/tntAllAccountUpdate');

        // skipping everything that is the listings for now
        const activeRentals = await splinterlandsService
            .getActiveRentals({ username })
            .catch((err) => {
                logger.error(`getActiveRentals error: ${err.message}`);
                throw err;
            });
        // TNT: maybe we can do this transform in another function?
        activeRentals.forEach((rental) => {
            rental.next_rental_payment_time = new Date(
                rental.next_rental_payment
            ).getTime();
            rental.buy_price = parseFloat(rental.buy_price);
        });

        const dbActiveRentals = await UserRentals.query()
            .where({
                users_id,
            })
            .whereBetween('next_rental_payment', [yesterday, tomorrow]);
    } catch (err) {
        logger.error(`updateRentalsInDb error: ${err.message}`);
        throw err;
    }
};
