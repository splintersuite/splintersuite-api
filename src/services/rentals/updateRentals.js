import _ from 'lodash';
import Users from '../../models/Users.js';
import UserRentalListings from '../../models/UserRentalListings.js';
import UserRentals from '../../models/UserRentals.js';
import findCardLevel from '../calculateCardLevel.js';
import histFncs from '../historicalData';
import collectionFncs from '../../actions/getCollectionFncs';
import updateListings from './updateListings.js';

// to be run EVERY 12 HOURS for EVERY USER
const updateRentalsInDb = async ({ username }) => {
    let user = await Users.query().where({ username });
    if (Array.isArray(user) && user.length === 1) {
        user = user[0];
    }

    const cardDetails = await histFncs.getCardDetail();
    const cardDetailsObj = {};
    cardDetails.forEach((card) => {
        cardDetailsObj[card.id] = card;
    });

    // hits the /collections endpoint and collects all of the listings we dont have in the db
    // inserts them and returns everything
    // we could have used the /collections endpoint for everything, ho hum...
    const { dbListings, apiListings } = await updateListings.updateListingsInDb(
        { users_id: user.id, username, cardDetailsObj }
    );

    // storing object for future use since /activerentals doesnt have the endpoint
    const slCreatedAtObj = {};
    apiListings.rented.forEach((listing) => {
        slCreatedAtObj[listing.sell_trx_id] = listing.market_created_date;
    });
    apiListings.notRented.forEach((listing) => {
        slCreatedAtObj[listing.sell_trx_id] = listing.market_created_date;
    });

    const dbRentals = await UserRentals.query().where({
        users_id: user.id,
        is_rental_active: true,
        cancelled_at: null,
    });

    const activeRentals = collectionFncs.getActiveRentals({ username });

    const dbListingsObj = {};
    const dbRentalsObj = {};
    dbListings.forEach((listing) => {
        if (!(listing.sell_trx_id in dbListingsObj)) {
            dbListingsObj[listing.sell_trx_id] = listing;
        }
    });
    dbRentals.forEach((rental) => {
        if (!(rental.sell_trx_id in dbRentals)) {
            dbRentalsObj[rental.sell_trx_id] = rental;
        }
    });

    const rentalsToCancel = [];
    const listingIdsToUpdateAsActiveRental = [];
    const rentalsToInsert = [];
    const rentalsWithoutListingsToInsert = [];
    const relistingToInsert = [];
    const unknownListingToInsert = [];
    activeRentals.data.forEach((activeRental) => {
        if (
            dbListingsObj[activeRental.sell_trx_id] &&
            dbListingsObj[activeRental.sell_trx_id].card_uid ===
                activeRental.card_id
        ) {
            // it's currently in the database as LISTING, not a rental
            if (
                activeRental.buy_price ===
                dbListingsObj[activeRental.sell_trx_id].price
            ) {
                // ok it's active and the price is the same...
                // update the listing as ACTIVE rental
                // create NEW UserRentals
                listingIdsToUpdateAsActiveRental.push(
                    dbListingsObj[activeRental.sell_trx_id].id
                );
                rentalsToInsert.push({
                    user_rental_listing_id:
                        dbListingsObj[activeRental.sell_trx_id].id,
                    // created_at: now,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: activeRental.buy_price,
                    rented_at: new Date(activeRental.rental_date),
                    player_rented_to: activeRental.renter,
                    is_rental_active: true,
                    cancelled_at: new Date(activeRental.cancel_date),
                });
            } else {
                // it's active now, but the price in the DB is different, we must have relisted since then...
                relistingToInsert.push({
                    users_id: user.id,
                    sl_created_at: new Date(
                        slCreatedAtObj[activeRental.sell_trx_id]
                    ),
                    cancelled_at:
                        activeRental.cancel_date &&
                        activeRental.cancel_player === username
                            ? new Date(activeRental.cancel_date)
                            : null,
                    card_detail_id: activeRental.card_detail_id,
                    level: dbListingsObj[activeRental.sell_trx_id].level,
                    card_uid: activeRental.card_id,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: activeRental.buy_price,
                    is_rental_active: true,
                    is_gold: activeRental.gold,
                });
                rentalsToInsert.push({
                    users_id: user.id,
                    user_rental_listing_id:
                        dbListingsObj[activeRental.sell_trx_id].id,
                    // created_at: now,
                    rented_at: new Date(activeRental.rental_date),
                    cancelled_at: new Date(activeRental.cancel_date),
                    player_rented_to: activeRental.renter,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: Number(activeRental.buy_price),
                    is_rental_active: true,
                });
            }
        } else if (
            dbRentalsObj[activeRental.sell_trx_id] &&
            dbRentalsObj[activeRental.sell_trx_id].card_uid ===
                activeRental.card_id
        ) {
            // we already know about this rental...
            // but we're only looking at rentals without a cancellation date
            if (activeRental.cancel_date) {
                // so lets update this rental to be cancelled
                // keep in mind the Listing re-lists at the SAME price when the rentals ends
                rentalsToCancel.push({
                    db_rental_id: dbRentalObj[activeRental.sell_trx_id].id,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    cancel_date: new Date(activeRental.cancel_date),
                });
            }

            // did the pricing change?  Not sure if this is possible
            // we must have relisted AND we don't know about listing at the moment
            if (
                activeRental.buy_price !==
                dbRentalsObj[activeRental.sell_trx_id].price
            ) {
                relistingToInsert.push({
                    users_id: user.id,
                    sl_created_at: new Date(
                        slCreatedAtObj[activeRental.sell_trx_id]
                    ),
                    cancelled_at:
                        activeRental.cancel_date &&
                        activeRental.cancel_player === username
                            ? new Date(activeRental.cancel_date)
                            : null,
                    card_detail_id: activeRental.card_detail_id,
                    level: dbListingsObj[activeRental.sell_trx_id].level,
                    card_uid: activeRental.card_id,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: Number(activeRental.buy_price),
                    is_rental_active: true,
                    is_gold: activeRental.gold,
                });
                // need to CREATE a new Rental associated with this listing!
                rentalsWithoutListingsToInsert.push({
                    users_id: user.id,
                    // NEED THE user_rental_listing_id once the listing is inserted
                    rented_at: new Date(activeRental.rental_date),
                    cancelled_at: new Date(activeRental.cancel_date),
                    player_rented_to: activeRental.renter,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    is_rental_active: true,
                    price: Number(activeRental.buy_price),
                });
            }
        } else {
            // we don't know about the listing OR transaction
            // setting created_at to rental_date
            unknownListingToInsert.push({
                users_id: user.id,
                sl_created_at: new Date(
                    slCreatedAtObj[activeRental.sell_trx_id]
                ),
                cancelled_at:
                    activeRental.cancel_date &&
                    activeRental.cancel_player === username
                        ? new Date(activeRental.cancel_date)
                        : null,
                card_detail_id: activeRental.card_detail_id,
                level: findCardLevel({
                    id: activeRental.card_detail_id,
                    rarity: cardDetailsObj[activeRental.card_detail_id].rarity,
                    _xp: activeRental.xp,
                    gold: activeRental.gold,
                    edition: activeRental.edition,
                    tier: cardDetailsObj[activeRental.card_detail_id].tier,
                    alpha_xp: 0,
                }),
                card_uid: activeRental.card_id,
                sell_trx_id: activeRental.sell_trx_id,
                price: Number(activeRental.buy_price),
                is_rental_active: true,
                is_gold: activeRental.gold,
            });

            // create a Rental
            rentalsWithoutListingsToInsert.push({
                users_id: user.id,
                // need user_rental_listing_id
                rented_at: new Date(activeRental.rental_date),
                cancelled_at: new Date(activeRental.cancel_date),
                player_rented_to: activeRental.renter,
                rental_tx: activeRental.rental_tx,
                sell_trx_id: activeRental.sell_trx_id,
                is_rental_active: true,
                price: Number(activeRental.buy_price),
            });
        }
    });

    // go the other way
    // iterate through db rentals and see if they are still active
    const missedRentalIdsToCancel = [];
    Object.keys(dbRentalsObj).forEach((sell_trx_id) => {
        const found = activeRentals.some((rental) => {
            return (
                rental.sell_trx_id === sell_trx_id &&
                dbRentalsObj[sell_trx_id].card_uid === rental.card_id
            );
        });
        if (!found) {
            // the rental must no longer be active
            // how did we miss this??
            missedRentalIdsToCancel.push(dbRentalsObj[sell_trx_id].id);
        }
    });

    // insert listing we don't know about
    const insertedListings = await UserRentalListings.query().insert(
        _.concat(unknownListingToInsert, relistingToInsert)
    );

    // we need to pluck the ids from these new listings so we can create rentals
    insertedListings.forEach((listing) => {
        const found = rentalsWithoutListingsToInsert.some((rental) => {
            if (rental.sell_trx_id === listing.sell_trx_id) {
                rental.user_rental_listing_id = listing.id;
                return true;
            }
        });
        if (!found) {
            console.log('listing missing frmo insertedListings', listing);
            console.log('insertedListings', insertedListings);
            process.exit();
        }
    });

    // insert all of the new rentals
    await UserRentals.query().insert(
        _.concat(rentalsWithoutListingsToInsert, rentalsToInsert)
    );
    // update listings to active in chunks with in statement
    let idActiveChunks = listingIdsToUpdateAsActiveRental;
    if (listingIdsToUpdateAsActiveRental.length > 998) {
        idActiveChunks = _.chunk(listingIdsToUpdateAsActiveRental, 998);
    }
    // ie it was unchanged
    if (idActiveChunks.length === listingIdsToUpdateAsActiveRental.length) {
        idActiveChunks = [idActiveChunks];
    }

    for (const idChunk of idActiveChunks) {
        await UserRentalListings.query()
            .whereIn({ id: idChunk })
            .patch({ is_rental_active: true });
    }

    // painful amount of database calls...  but we have to update EACH record because we need to know
    // what the cancel of each rental_tx is...  woooof
    for (const rentalToCancel of rentalsToCancel) {
        await UserRentals.query()
            .where({ id: rentalToCancel.db_rental_id })
            .patch({
                rental_tx: rentalToCancel.rental_tx,
                sell_trx_id: rentalToCancel.sell_trx_id,
                cancel_date: rentalToCancel.cancel_date,
            });
    }
};

updateRentalsInDb({ username: 'xdww' });

export default updateRentalsInDb;
