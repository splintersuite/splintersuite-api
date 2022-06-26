const _ = require('lodash');
const UserRentals = require('../../models/UserRentals');
const findCardLevel = require('../../util/calculateCardLevel');
const updateListings = require('./updateListings');
const rentalHelpers = require('./rentalHelpers');
const logger = require('../../util/pinologger');
const { SPLINTERLANDS_API } = require('./types');
const splinterlandsService = require('../../services/splinterlands');

// to be run EVERY 12 HOURS for EVERY USER
const updateRentalsInDb = async ({ username, users_id, cardDetailsObj }) => {
    try {
        logger.debug('updateRentalsInDb start');
        // hits the /collections endpoint and collects all of the listings we dont have in the db
        // inserts them and returns everything
        // we could have used the /collections endpoint for everything, ho hum...
        const {
            dbListingsNotRented,
            dbListingsRented,
            apiListings,
            insertedListings,
        } = await updateListings.updateListingsInDb({
            users_id,
            username,
            cardDetailsObj,
        });

        // sets is_active_rental to null if they dropped off...
        await rentalHelpers.patchCancelledRecords({ users_id });

        // setting up objects for faster lookup later on
        const dbListingsObj = {};
        const dbListingsRentedObj = {};
        dbListingsNotRented.forEach((listing) => {
            if (!(listing.sell_trx_id in dbListingsObj)) {
                dbListingsObj[listing.sell_trx_id] = listing;
            }
        });
        dbListingsRented.forEach((listing) => {
            if (!(listing.sell_trx_id in dbListingsRentedObj)) {
                dbListingsRentedObj[listing.sell_trx_id] = listing;
            }
        });

        // storing object for future use since /activerentals doesnt have the endpoint
        const slCreatedAtObj = {};
        const slLevelObj = {};
        apiListings.rented.forEach((listing) => {
            slCreatedAtObj[listing.sell_trx_id] = listing.market_created_date;
            slLevelObj[listing.sell_trx_id] = listing.level;
        });
        apiListings.notRented.forEach((listing) => {
            slCreatedAtObj[listing.sell_trx_id] = listing.market_created_date;
            slLevelObj[listing.sell_trx_id] = listing.level;
        });

        // getting call active rentals... creating object for faster lookup
        const dbRentals = await UserRentals.query().where({
            users_id,
            is_rental_active: true,
        });
        const dbRentalsObj = {};
        dbRentals.forEach((rental) => {
            if (!(rental.sell_trx_id in dbRentalsObj)) {
                dbRentalsObj[rental.sell_trx_id] = {
                    ...rental,
                    card_uid: dbListingsRentedObj[rental.sell_trx_id].card_uid,
                    level: parseInt(
                        dbListingsRentedObj[rental.sell_trx_id].level
                    ),
                };
            }
        });

        // getting active rentals  = require(/activerentals?{username} endpoint
        // again - could have done this with the collections endpoints.
        const activeRentals = await splinterlandsService.getActiveRentals({
            username,
        });

        // here i am iterating over what the API knows as a active rental
        // and checking to see if we have the corresponding listing & rentals records in our database
        const rentalsToCancel = [];
        const listingIdsToUpdateAsActiveRental = [];
        const rentalsToInsert = [];
        const rentalsWithoutListingsToInsert = [];
        const relistingToInsert = [];
        const unknownListingToInsert = [];
        activeRentals.forEach((activeRental) => {
            // test to see if we know about this listing, but not the rental
            // remember dbListingsObj is ONLY listings without rentals...
            if (
                dbListingsObj[activeRental.sell_trx_id] &&
                dbListingsObj[activeRental.sell_trx_id].card_uid ===
                    activeRental.card_id
            ) {
                // it's currently in the database as LISTING, not a rental
                if (
                    _.round(Number(activeRental.buy_price), 3) ===
                    _.round(
                        Number(dbListingsObj[activeRental.sell_trx_id].price),
                        3
                    )
                ) {
                    // ok it's active and the price is the same...
                    // update the listing as ACTIVE rental
                    // create NEW UserRental record
                    listingIdsToUpdateAsActiveRental.push(
                        dbListingsObj[activeRental.sell_trx_id].id
                    );
                    rentalsToInsert.push({
                        users_id,
                        user_rental_listing_id:
                            dbListingsObj[activeRental.sell_trx_id].id,
                        rental_tx: activeRental.rental_tx,
                        sell_trx_id: activeRental.sell_trx_id,
                        price: Number(activeRental.buy_price),
                        rented_at: new Date(activeRental.rental_date),
                        player_rented_to: activeRental.renter,
                        is_rental_active: true,
                        cancelled_at:
                            activeRental.cancel_date !== null
                                ? new Date(activeRental.cancel_date)
                                : null,
                    });
                } else {
                    // it's active now, but the price in the DB is different, we must have relisted since then...
                    relistingToInsert.push({
                        users_id,
                        sl_created_at: new Date(
                            slCreatedAtObj[activeRental.sell_trx_id]
                        ),
                        cancelled_at:
                            activeRental.cancel_date &&
                            activeRental.cancel_player === username
                                ? new Date(activeRental.cancel_date)
                                : null,
                        card_detail_id: activeRental.card_detail_id,
                        level: parseInt(
                            dbListingsObj[activeRental.sell_trx_id].level
                        ),
                        edition: parseInt(activeRental.edition),
                        card_uid: activeRental.card_id,
                        sell_trx_id: activeRental.sell_trx_id,
                        source: SPLINTERLANDS_API,
                        price: Number(activeRental.buy_price),
                        is_rental_active: true,
                        is_gold: activeRental.gold,
                    });
                    rentalsToInsert.push({
                        users_id,
                        user_rental_listing_id:
                            dbListingsObj[activeRental.sell_trx_id].id,
                        rented_at: new Date(activeRental.rental_date),
                        cancelled_at:
                            activeRental.cancel_date !== null
                                ? new Date(activeRental.cancel_date)
                                : null,
                        player_rented_to: activeRental.renter,
                        rental_tx: activeRental.rental_tx,
                        sell_trx_id: activeRental.sell_trx_id,
                        price: Number(activeRental.buy_price),
                        is_rental_active: true,
                    });
                }
                // check to see if already know about the rental
            } else if (
                dbRentalsObj[activeRental.sell_trx_id] &&
                dbRentalsObj[activeRental.sell_trx_id].card_uid ===
                    activeRental.card_id
            ) {
                // we already know about this rental...
                // but we're only looking at rentals without a cancellation date or within a day of now
                if (
                    activeRental.cancel_date &&
                    !dbRentalsObj[activeRental.sell_trx_id].cancelled_at
                ) {
                    // so this rental has been cancelled... lets update this rental to be cancelled
                    // keep in mind the Listing re-lists at the SAME price when the rentals ends
                    // im not going to add a cancel date to the listing
                    rentalsToCancel.push({
                        db_rental_id: dbRentalsObj[activeRental.sell_trx_id].id,
                        rental_tx: activeRental.rental_tx,
                        sell_trx_id: activeRental.sell_trx_id,
                        cancelled_at:
                            activeRental.cancel_date !== null
                                ? new Date(activeRental.cancel_date)
                                : null,
                    });
                }

                // did the pricing change?  Not sure if this is possible
                // we must have relisted AND we don't know about listing at the moment
                // so we need to insert a new one
                if (
                    _.round(Number(activeRental.buy_price), 3) !==
                    _.round(
                        Number(dbRentalsObj[activeRental.sell_trx_id].price),
                        3
                    )
                ) {
                    relistingToInsert.push({
                        users_id,
                        sl_created_at: new Date(
                            slCreatedAtObj[activeRental.sell_trx_id]
                        ),
                        cancelled_at:
                            activeRental.cancel_date &&
                            activeRental.cancel_player === username
                                ? new Date(activeRental.cancel_date)
                                : null,
                        card_detail_id: activeRental.card_detail_id, // TNT QUESTION: HOW IS THIS POSSIBLE?  on collection it is id
                        level: parseInt(
                            dbRentalsObj[activeRental.sell_trx_id].level
                        ),
                        edition: parseInt(activeRental.edition),
                        card_uid: activeRental.card_id,
                        sell_trx_id: activeRental.sell_trx_id,
                        price: Number(activeRental.buy_price),
                        is_rental_active: true,
                        source: SPLINTERLANDS_API,
                        is_gold: activeRental.gold,
                    });
                    // need to CREATE a new Rental associated with this listing!
                    rentalsWithoutListingsToInsert.push({
                        users_id,
                        // NEED THE user_rental_listing_id once the listing is inserted
                        rented_at: new Date(activeRental.rental_date),
                        cancelled_at:
                            activeRental.cancel_date !== null
                                ? new Date(activeRental.cancel_date)
                                : null,
                        player_rented_to: activeRental.renter,
                        rental_tx: activeRental.rental_tx,
                        sell_trx_id: activeRental.sell_trx_id,
                        is_rental_active: true,
                        price: Number(activeRental.buy_price),
                    });
                }
            } else if (
                dbListingsRentedObj[activeRental.sell_trx_id] &&
                dbListingsRentedObj[activeRental.sell_trx_id].card_uid ===
                    activeRental.card_uid
            ) {
                // this means we know the listing to be actively rented
                // but do we need to make a rentals?
                if (!dbRentalsObj[activeRental.sell_trx_id]) {
                    // we need to make a rental obj
                    // this should never really happen...
                    throw new Error(
                        `bug here, active listing without corresponding rental${activeRental.sell_trx_id}`
                    );
                }
            } else {
                // we don't know about the listing OR transaction
                // setting created_at to rental_date
                // hopefully this does not happen too often... it shouldn't if we are running this every 12 hours
                unknownListingToInsert.push({
                    users_id,
                    sl_created_at: new Date(
                        slCreatedAtObj[activeRental.sell_trx_id]
                    ),
                    cancelled_at:
                        activeRental.cancel_date &&
                        activeRental.cancel_player === username
                            ? new Date(activeRental.cancel_date)
                            : null,
                    edition: parseInt(activeRental.edition),
                    card_detail_id: activeRental.card_detail_id,
                    level: parseInt(slLevelObj[activeRental.sell_trx_id]),
                    card_uid: activeRental.card_id,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: Number(activeRental.buy_price),
                    source: SPLINTERLANDS_API,
                    is_rental_active: true,
                    is_gold: activeRental.gold,
                });

                // create a UserRental
                rentalsWithoutListingsToInsert.push({
                    users_id,
                    // need user_rental_listing_id.  will pluck it once we insert the UserRentalListing
                    rented_at: new Date(activeRental.rental_date),
                    cancelled_at:
                        activeRental.cancel_date !== null
                            ? new Date(activeRental.cancel_date)
                            : null,
                    player_rented_to: activeRental.renter,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    is_rental_active: true,
                    price: Number(activeRental.buy_price),
                });
            }
        });

        // go the other way
        // iterate through db rentals and see if they are still active on the api
        const missedRentalIdsToCancel = [];
        Object.keys(dbRentalsObj).forEach((sell_trx_id) => {
            const found = activeRentals.some((rental) => {
                return (
                    rental.sell_trx_id === sell_trx_id &&
                    dbRentalsObj[sell_trx_id].card_uid === rental.card_id
                );
            });
            if (!found) {
                // the rental in the database must no longer be active
                // how did we miss this??
                missedRentalIdsToCancel.push(dbRentalsObj[sell_trx_id].id);
            }
        });

        if (missedRentalIdsToCancel.length > 0) {
            await rentalHelpers.handleMissedRentalIdsToCancel({
                missedRentalIdsToCancel,
            });
        }

        // insert listing we don't know about
        const newlyInsertedListings = await rentalHelpers.insertNewListings({
            unknownListingToInsert,
            relistingToInsert,
        });

        // we need to pluck the ids  = require(these new listings so we can create rentals
        await rentalHelpers.insertRentalsFromNewListings({
            aggInsertedListings: _.concat(
                insertedListings,
                newlyInsertedListings
            ),
            rentalsWithoutListingsToInsert,
            rentalsToInsert,
        });

        // update listings to active in chunks with in statement
        await rentalHelpers.updateListingsAsActiveRentals({
            listingIdsToUpdateAsActiveRental,
        });

        // painful amount of database calls...
        // but we have to update EACH record because we need to know
        // what the cancel of each rental_tx is...  woooof
        await rentalHelpers.patchRentalsToCancel({ rentalsToCancel });
    } catch (err) {
        logger.error(`updateRentalsInDb error: ${err.message}`);
        logger.error(err.stack);
        throw err;
    }
};

// updateRentalsInDb({ username: 'xdww' });

module.exports = { updateRentalsInDb, SPLINTERLANDS_API };
