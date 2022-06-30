'use strict';
const _ = require('lodash');
const UserRentals = require('../../models/UserRentals');
const logger = require('../../util/pinologger');
const splinterlandsService = require('../../services/splinterlands');
const utilDates = require('../../util/dates');
const findCardLevel = require('../../util/calculateCardLevel');

const updateRentalsInDb = async ({ username, users_id, cardDetailsObj }) => {
    try {
        logger.debug('/services/rentals/tntAllAccountUpdate/updateRentalsInDB');

        const activeRentals = await splinterlandsService
            .getActiveRentals({ username })
            .catch((err) => {
                logger.error(
                    `/services/rentals/tntAllAccountUpdate/updateRentalsInDB getActiveRentals with users_id: ${users_id} error: ${err.message}`
                );
                throw err;
            });

        const newActiveRentals = cleanAPIActiveRentals({ activeRentals });

        const dbActiveRentals = await getActiveRentalsInDB({ users_id }).catch(
            (err) => {
                logger.error(
                    `/services/rentals/tntAllAccountUpdate/updateRentalsInDB getActiveRentalsInDB with users_id: ${users_id} error: ${err.messsage}`
                );
                throw err;
            }
        );

        const dbRentalsByUid = searchableByUidDBRentals({
            rentals: dbActiveRentals,
        });

        const { rentalsToInsert, rentalsAlreadyInserted } = filterIfInDB({
            newActiveRentals,
            dbRentalsByUid,
            users_id,
            cardDetailsObj,
        });

        logger.debug(
            `rentalsALreadyInserted: ${JSON.stringify(rentalsAlreadyInserted)}`
        );
        logger.debug(`rentalsToInsert: ${JSON.stringify(rentalsToInsert)}`);

        await insertActiveRentals({ rentals: rentalsToInsert }).catch((err) => {
            logger.error(
                `/services/rentals/tntAllAccountUpdate/updateRentalsInDb insertActiveRentals with rentals: ${JSON.stringify(
                    rentalsToInsert
                )} error: ${err.message}`
            );
            throw err;
        });
        logger.info(
            '/services/rentals/tntAllAccountUpdate/updateRentalsInDB done'
        );

        return;
    } catch (err) {
        logger.error(
            `/services/rentals/tntAllAccountUpdate/updateRentalsInDb error: ${err.message}`
        );
        throw err;
    }
};

const insertActiveRentals = async ({ rentals }) => {
    try {
        logger.debug(
            '/services/rentals/tntAllAccountUpdate/insertActiveRentals'
        );

        if (rentals.length === 0) {
            logger.info(
                `/services/rentals/tntAllAccountUpdate/insertActiveRentals no rentals to insert`
            );
            return;
        }
        let chunks = rentals;
        if (rentals.length > 1000) {
            chunks = _.chunk(rentals, 1000);
        }

        if (chunks.length === rentals.length) {
            chunks = [chunks];
        }
        for (const rentalChunk of chunks) {
            await UserRentals.query()
                .insert(rentals)
                .catch((err) => {
                    logger.error(
                        `/services/rentals/tntAllAccountUpdate/insertActiveRentals UserRentals table insert fail on rentals: ${JSON.stringify(
                            rentals
                        )}, rentalChunk: ${JSON.stringify(
                            rentalChunk
                        )} error: ${err.message}`
                    );
                    throw err;
                });
        }

        logger.info(
            `/services/rentals/tntAllAccountUpdate/insertActiveRentals done`
        );
        return;
    } catch (err) {
        logger.error(
            `/services/rentals/tntAllAccountUpdate/insertActiveRentals error: ${err.message}`
        );
        throw err;
    }
};

const getActiveRentalsInDB = async ({ users_id }) => {
    try {
        logger.debug(
            '/services/rentals/tntAllAccountUpdate/getActiveRentalsInDB'
        );

        const now = new Date();
        // this is due to some lag on splinterlands api where an active_rental that expired doesn't get expired from the api immediately
        const oneAndAHalf = utilDates.getNumDaysAgo({
            numberOfDaysAgo: 1.5,
            date: now,
        });

        const dbActiveRentals = await UserRentals.query()
            .where({ users_id })
            .whereBetween('last_rental_payment', [oneAndAHalf.daysAgo, now])
            .catch((err) => {
                logger.error(
                    `/services/rentals/tntAllAccountUpdate/getActiveRentalsInDB UserRentals query with users_id: ${users_id}, now: ${now} and oneDayAgo: ${oneDayAgo} error: ${err.message}`
                );
                throw err;
            });

        logger.debug(
            `/services/rentals/tntAllAccountUpdate/getActiveRentalsInDB done, dbActiveRentals: ${JSON.stringify(
                dbActiveRentals
            )} `
        );
        logger.info(
            `/services/rentals/tntAllAccountUpdate/getActiveRentalsInDB done`
        );
        return dbActiveRentals;
    } catch (err) {
        logger.error(
            `/services/rentals/tntAllAccountUpdate/getActiveRentalsInDB error: ${err.message}`
        );
        throw err;
    }
};

// converts an array of active_rentals into an object that you can search for a rental by the card_uid of the card rented out
const searchableByUidDBRentals = ({ rentals }) => {
    try {
        logger.debug(
            '/services/rentals/tntAllAccountUpdate/searchableByUidDBRentals'
        );

        const rentalsObj = {};
        rentals.forEach((rental) => {
            rentalsObj[rental.card_uid] = rental;
        });
        logger.info(
            '/services/rentals/tntAllAccountUpdate/searchableByUidDBRentals done'
        );

        return rentalsObj;
    } catch (err) {
        logger.error(
            `/services/rentals/tntAllAccountUpdate/searchableByUidDBRentals error: ${err.message}`
        );
        throw err;
    }
};

const cleanAPIActiveRentals = ({ activeRentals }) => {
    try {
        logger.debug(
            '/services/rentals/tntAllAccountUpdate/cleanAPIActiveRentals'
        );
        activeRentals.forEach((rental) => {
            const { oneDayAgo, oneDayAgoInMS } = utilDates.getOneDayAgo({
                date: rental.next_rental_payment,
            });

            rental.buy_price = parseFloat(rental.buy_price);
            rental.last_rental_payment = oneDayAgo;
        });

        logger.info(
            '/services/rentals/tntAllAccountUpdate/cleanAPIActiveRentalsdone'
        );

        return activeRentals;
    } catch (err) {
        logger.error(
            `/services/rentals/tntAllAccountUpdate/cleanAPIActiveRentalsdone error: ${err.message}`
        );
        throw err;
    }
};

const filterIfInDB = ({
    newActiveRentals,
    dbRentalsByUid,
    users_id,
    cardDetailsObj,
}) => {
    try {
        logger.debug('/services/rentals/tntAllAccountUpdate/filterIfInDB');

        const rentalsToInsert = [];
        const rentalsAlreadyInserted = [];
        const rentalsThatMightCrossover = [];

        newActiveRentals.forEach((rental) => {
            // APIRental.card_id = card.uid from collection API, both saved to card_uid column
            const card_uid = rental.card_id;
            const next_rental_payment = new Date(rental.next_rental_payment);
            const { oneDayAgo } = utilDates.getOneDayAgo({
                date: next_rental_payment,
            });
            const last_rental_payment = oneDayAgo;
            const card_details = cardDetailsObj[rental.card_detail_id];
            logger.debug(
                `card_details output for card_detail_id: ${
                    rental.card_detail_id
                } is: ${JSON.stringify(card_details)}`
            );
            const level = findCardLevel({
                id: rental.card_detail_id,
                rarity: card_details.rarity,
                _xp: rental.xp,
                gold: rental.gold,
                edition: card_details.edition,
                tier: rental.tier,
                alpha_xp: 0,
            });
            const rentalToAdd = {
                users_id,
                rented_at: new Date(rental.rental_date),
                next_rental_payment,
                last_rental_payment,
                edition: rental.edition,
                card_detail_id: rental.card_detail_id,
                level,
                xp: rental.xp,
                price: Number(rental.buy_price),
                is_gold: rental.gold,
                card_uid,
                player_rented_to: rental.renter,
                rental_tx: rental.rental_tx,
                sell_trx_id: rental.sell_trx_id,
            };
            const matchedRental = dbRentalsByUid[card_uid];

            if (card_uid === 'C7-370-03NOSSV4V4') {
                logger.info(
                    `card_uid is: ${card_uid}, dbRentalsByUid: ${JSON.stringify(
                        dbRentalsByUid
                    )}`
                );

                //  throw new Error('checking output');
            }

            if (matchedRental != null) {
                logger.info('matchedRental is not null');
                // there was a match
                if (
                    matchedRental.rental_tx === rental.rental_tx &&
                    matchedRental.sell_trx_id === rental.sell_trx_id
                ) {
                    logger.info(
                        'matchedRental rental_tx and sell_trx = rental.rental_tx and sell_trx_id'
                    );
                    const matchedNextRentPmnt = new Date(
                        matchedRental.next_rental_payment
                    ).getTime();
                    const rentalNextRentPmnt = new Date(
                        rental.next_rental_payment
                    ).getTime();
                    if (matchedNextRentPmnt === rentalNextRentPmnt) {
                        logger.info(
                            `matchedRental next_rental_payment (in ms): ${matchedNextRentPmnt} === rental.next_rental_payment: ${rentalNextRentPmnt} with same rental_tx and sell_trx_id`
                        );
                        rentalsAlreadyInserted.push(rentalToAdd);
                    } else {
                        logger.info(`rental is: ${JSON.stringify(rental)}`);
                        logger.info(
                            ` matchedRental: ${JSON.stringify(matchedRental)}`
                        );
                        logger.info(
                            `matchedRental rental_tx and sell_trx are the same, but the next_rental_payment is different`
                        );
                        throw new Error(`this shouldnt happen`);
                    }
                } else {
                    // might want to do more than warn here, this shouldn't really happen
                    logger.warn(
                        `matchedRental: ${JSON.stringify(
                            matchedRental
                        )} from rental: ${JSON.stringify(
                            rental
                        )} is in db but not same rental_tx and sell_trx_id`
                    );
                    //rentalsThatMightCrossover.push(rentalToAdd);
                    rentalsToInsert.push(rentalToAdd);
                }
            } else {
                logger.info('matchedRental == null, and we need to insert it');
                // there was no match, need to insert this into the db
                rentalsToInsert.push(rentalToAdd);
            }
            if (card_uid === 'C7-370-03NOSSV4V4') {
                //    throw new Error('checking new output');
            }
        });
        logger.info('/services/rentals/tntAllAccountUpdate/filterIfInDB done');
        logger.info(`rentalsToInsert: ${JSON.stringify(rentalsToInsert)}`);
        return {
            rentalsToInsert,
            rentalsAlreadyInserted,
            rentalsThatMightCrossover,
        };
    } catch (err) {
        logger.error(
            `/services/rentals/tntAllAccountUpdate/filterIfInDB error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    updateRentalsInDb,
};
