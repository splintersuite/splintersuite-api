import _ from 'lodash';
import UserRentalListings from '../../models/UserRentalListings.js';
import UserRentals from '../../models/UserRentals.js';
import collectionFncs from '../../actions/getCollectionFncs.js';
import rentalHelpers from './rentalHelpers.js';

// to be run EVERY 12 HOURS for EVERY USER
const updateRentalsInDb = async ({ username, users_id }) => {
    const today = new Date();
    const yday = new Date(today.setDate(today.getDate() - 1));
    const tmrw = new Date(today.setDate(today.getDate() + 1));
    const dbListings = await UserRentalListings.query()
        .where({
            users_id,
            // is_rental_active: false,
            cancelled_at: null,
        })
        .orWhereBetween('cancelled_at', [yday, tmrw]);

    // looks to see stuff cancelled.  marks listings/rentals as is_rental_active: false
    await rentalHelpers.patchCancelledRecords({ users_id });

    // create objects for future lookup
    const dbListingsRentedObj = {};
    dbListings
        .filter(({ is_rental_active }) => is_rental_active === true)
        .forEach((listing) => {
            if (!(listing.sell_trx_id in dbListingsRentedObj)) {
                dbListingsRentedObj[listing.sell_trx_id] = listing;
            }
        });

    // getting active rentals from /activerentals?{username} endpoint
    // again - could have done this with the collections endpoints.
    const activeRentals = await collectionFncs.getActiveRentals({
        username,
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
                level: parseInt(dbListingsRentedObj[rental.sell_trx_id].level),
            };
        }
    });

    const rentalsToInsert = [];
    const rentalsIdsToMarkInactive = [];
    const listingsToCancel = [];
    const rentalsToCancel = [];
    const listingIdsToUpdateAsActiveRental = [];
    activeRentals.forEach((activeRental) => {
        dbListings.forEach((listing) => {
            if (
                activeRental.sell_trx_id === listing.sell_trx_id &&
                activeRental.card_uid === listing.card_uid
            ) {
                // was this one of our listings??
                if (
                    dbRentals[activeRental.sell_trx_id] &&
                    dbRentals[activeRental.sell_trx_id].card_uid ===
                        listing.card_uid
                ) {
                    // we already have a rental in the database

                    // check to see if the rental has been cancelled by us...
                    // if so, then we'll update the listing
                    if (
                        activeRental.cancel_date &&
                        activeRental.cancel_player === username
                    ) {
                        listingsToCancel.push({
                            id: listing.id,
                            cancelled_at: new Date(activeRental.cancel_date),
                        });
                    }

                    if (
                        _.round(Number(activeRental.buy_price), 3) ===
                        _.round(Number(listing.price), 3)
                    ) {
                        // we have an issue...  the prices aren't the same!
                        // is this possible??
                        console.log('prices arent the same...');
                        console.log('activeRental', activeRental);
                        console.log('listing', listing);
                        process.exit();
                    }

                    // check to see it's the same player.  if not we need to add a new record to rentals
                    if (
                        dbRentals[activeRental.player_rented_to] !==
                        activeRental.player_rented_to
                    ) {
                        // the listing re-listed automatically and has been re-rented.
                        // set the current rental to inactive
                        // create a new rental
                        rentalsIdsToMarkInactive.push(
                            dbRentals[activeRental.player_rented_to].id
                        );
                        rentalsToInsert.push({
                            users_id,
                            user_rental_listing_id: listing.id,
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

                        // do i need to update the rental as cancelled?
                    } else if (
                        activeRental.cancel_date &&
                        !dbRentalsObj[activeRental.sell_trx_id].cancelled_at
                    ) {
                        // so this rental has been cancelled... lets update this rental to be cancelled
                        // keep in mind the Listing re-lists at the SAME price when the rentals ends
                        // im not going to add a cancel date to the listing
                        rentalsToCancel.push({
                            db_rental_id:
                                dbRentalsObj[activeRental.sell_trx_id].id,
                            rental_tx: activeRental.rental_tx,
                            cancelled_at:
                                activeRental.cancel_date !== null
                                    ? new Date(activeRental.cancel_date)
                                    : null,
                        });
                    }
                } else {
                    // we don't know about this rental!
                    // update the listing as active! Add a new rental

                    listingIdsToUpdateAsActiveRental.push(listing.id);

                    rentalsToInsert.push({
                        users_id,
                        user_rental_listing_id: listing.id,
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
                }
            }
        });
    });

    // update listings to active in chunks with in statement
    await rentalHelpers.updateListingsAsActiveRentals({
        listingIdsToUpdateAsActiveRental,
    });

    // painful amount of database calls...
    // but we have to update EACH record because we need to know individually when they are cancelled_at
    await rentalHelpers.patchRentalsToCancel({ rentalsToCancel });
    await rentalHelpers.cancelListings({
        listingsToCancel,
    });

    // mark these rentals as inactive... ideally this never happens
    // cancelled_at is the current time... really can't know for sure unfort
    await rentalHelpers.markRentalsInactive({ rentalsIdsToMarkInactive });

    // oh yeah.  finally insert what we came for in the first place...
    if (rentalsToInsert.length > 0) {
        await UserRentals.query().insert(rentalsToInsert);
    }
};

updateRentalsInDb({
    username: 'xdww',
    users_id: '5eadd15a-b7d1-4fe5-a636-f4fa5d42c447',
});

export default { updateRentalsInDb };
