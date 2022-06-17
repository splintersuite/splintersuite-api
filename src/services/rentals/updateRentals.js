import Users from '../../models/Users.js';
import UserRentalListings from '../../models/UserRentalListings.js';
import axiosInstance from '../../util/axiosInstance.js';
import findCardLevel from '../calculateCardLevel.js';
import _ from 'lodash';

// to be run EVERY 12 HOURS for EVERY USER
const updateRentalsInDb = async ({ username }) => {
    console.log('username', username);
    let user = await Users.query().where({ username });
    if (Array.isArray(user) && user.length === 1) {
        user = user[0];
    }
    const dbListings = await UserRentalListings.query().where({
        users_id: user.id,
        is_rental_active: false,
        cancelled_at: null,
        rented_at: null,
    });

    const dbRentals = await UserRentalListings.query().where({
        users_id: user.id,
        is_rental_active: true,
        cancelled_at: null,
    });

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

    const activeRentals = await axiosInstance.get(
        `https://api2.splinterlands.com/market/active_rentals?owner=${username}`
    );

    if (!Array.isArray(activeRentals.data)) {
        throw new Error(
            `https://api2.splinterlands.com/market/active_rentals?owner=${username} returning something crazy`
        );
    }

    const rentalsToCancel = [];
    const rentalsToUpdateAsActive = [];
    const relistingToInsert = [];
    const listingToInsert = [];
    activeRentals.forEach((activeRental) => {
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
                rentalsToUpdateAsActive.push({
                    db_rental_id: dbListingsObj[activeRental.sell_trx_id].id,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: activeRental.buy_price,
                    rented_at: activeRental.rental_date,
                    player_rented_to: activeRental.renter,
                    is_rental_active: true,
                    cancelled_at: activeRental.cancel_date,
                });
            } else {
                // it's active now, but the price in the DB is different, we must have relisted...
                relistingToInsert.push({
                    users_id: user.id,
                    created_at: activeRental.rental_date,
                    rented_at: activeRental.rental_date,
                    cancelled_at: activeRental.cancel_date,
                    player_rented_to: activeRental.renter,
                    card_detail_id: activeRental.card_detail_id,
                    level: dbListingsObj[activeRental.sell_trx_id].level,
                    card_uid: activeRental.card_id,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: activeRental.buy_price,
                    is_rental_active: true,
                    is_gold: activeRental.gold,
                });
            }
        } else if (
            dbRentalsObj[activeRental.sell_trx_id] &&
            dbRentalsObj[activeRental.sell_trx_id].card_uid ===
                activeRental.card_id
        ) {
            // we already know about this rental...
            if (activeRental.cancel_date) {
                // does it have a cancel date?
                rentalsToCancel.push({
                    db_rental_id: dbRentalObj[activeRental.sell_trx_id].id,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    cancel_date: activeRental.cancel_date,
                });
            }

            // did the pricing change?  Not sure if this is possible
            if (
                activeRental.buy_price ===
                dbRentalsObj[activeRental.sell_trx_id].price
            ) {
                relistingToInsert.push({
                    users_id: user.id,
                    created_at: activeRental.rental_date,
                    rented_at: activeRental.rental_date,
                    cancelled_at: activeRental.cancel_date,
                    player_rented_to: activeRental.renter,
                    card_detail_id: activeRental.card_detail_id,
                    level: dbListingsObj[activeRental.sell_trx_id].level,
                    card_uid: activeRental.card_id,
                    rental_tx: activeRental.rental_tx,
                    sell_trx_id: activeRental.sell_trx_id,
                    price: activeRental.buy_price,
                    is_rental_active: true,
                    is_gold: activeRental.gold,
                });
            }
        } else {
            // we don't know about the listing OR transaction
            // setting created_at to rental_date
            listingToInsert.push({
                users_id: user.id,
                created_at: activeRental.rental_date,
                rented_at: activeRental.rental_date,
                cancelled_at: activeRental.cancel_date,
                player_rented_to: activeRental.renter,
                card_detail_id: activeRental.card_detail_id,
                level: findCardLevel(activeRental.xp),
                card_uid: activeRental.card_id,
                rental_tx: activeRental.rental_tx,
                sell_trx_id: activeRental.sell_trx_id,
                price: activeRental.buy_price,
                is_rental_active: true,
                is_gold: activeRental.gold,
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

    // transactions we don't know about
    const listingsToInsert = _.concat(listingToInsert, relistingToInsert);
    await UserRentalListings.query().insert(listingsToInsert);

    // painful amount of database calls... but we have to update EACH record
    for (const rentalToCancel of rentalsToCancel) {
        await UserRentalListings.query()
            .where({ id: rentalToCancel.db_rental_id })
            .patch({
                rental_tx: rentalToCancel.rental_tx,
                sell_trx_id: rentalToCancel.sell_trx_id,
                cancel_date: rentalToCancel.cancel_date,
            });
    }

    for (const rentalToUpdate of rentalsToUpdateAsActive) {
        await UserRentalListings.query()
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
