const _ = require('lodash');
const UserRentals = require('../../models/UserRentals');
const UserRentalListings = require('../../models/UserRentalListings');

const handleMissedRentalIdsToCancel = async ({ missedRentalIdsToCancel }) => {
    const now = new Date();
    let idChunks = missedRentalIdsToCancel;
    if (missedRentalIdsToCancel.length > 998) {
        idChunks = _.chunk(missedRentalIdsToCancel, 998);
    }
    // ie it was unchanged
    if (idChunks.length === missedRentalIdsToCancel.length) {
        idChunks = [idChunks];
    }

    for (const idChunk of idChunks) {
        await UserRentals.query()
            .whereIn('id', idChunk)
            .patch({ is_rental_active: false, cancelled_at: now });
    }
};

const updateListingsAsActiveRentals = async ({
    listingIdsToUpdateAsActiveRental,
}) => {
    if (listingIdsToUpdateAsActiveRental.length === 0) {
        return;
    }
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
            .whereIn('id', idChunk)
            .patch({ is_rental_active: true });
    }
};

const patchRentalsToCancel = async ({ rentalsToCancel }) => {
    if (rentalsToCancel.length === 0) {
        return;
    }
    for (const rentalToCancel of rentalsToCancel) {
        await UserRentals.query()
            .where({ id: rentalToCancel.db_rental_id })
            .patch({
                rental_tx: rentalToCancel.rental_tx,
                cancelled_at: rentalToCancel.cancelled_at,
            });
    }
};

const insertRentalsFromNewListings = async ({
    aggInsertedListings,
    rentalsWithoutListingsToInsert,
    rentalsToInsert,
}) => {
    rentalsWithoutListingsToInsert.forEach((rental) => {
        const found = aggInsertedListings.some((listing) => {
            if (rental.sell_trx_id === listing.sell_trx_id) {
                rental.user_rental_listing_id = listing.id;
                return true;
            }
        });
        if (!found) {
            throw new Error(
                `missing id for rental ${rental.sell_trx_id} ${rental.rental_tx}`
            );
        }
    });

    // aggregate and insert all of the new rentals
    const aggRentalsToInsert = _.concat(
        rentalsWithoutListingsToInsert,
        rentalsToInsert
    );

    if (aggRentalsToInsert.length > 0) {
        await UserRentals.query().insert(aggRentalsToInsert);
    }
};

const insertNewListings = async ({
    unknownListingToInsert,
    relistingToInsert,
}) => {
    const aggListingsToInsert = _.concat(
        unknownListingToInsert,
        relistingToInsert
    );
    let insertedListings = [];
    if (aggListingsToInsert.length > 0) {
        insertedListings = await UserRentalListings.query().insert(
            aggListingsToInsert
        );
    }
    return insertedListings;
};

const markRentalsInactive = async ({ rentalsIdsToMarkInactive }) => {
    if (rentalsIdsToMarkInactive.length === 0) {
        return;
    }
    const now = new Date();
    let chunks = rentalsIdsToMarkInactive;
    if (rentalsIdsToMarkInactive.length > 998) {
        chunks = _.chunk(rentalsIdsToMarkInactive, 998);
    }
    // ie it was unchanged
    if (chunks.length === rentalsIdsToMarkInactive.length) {
        chunks = [chunks];
    }

    for (const idChunk of chunks) {
        await UserRentals.query()
            .whereIn('id', idChunk)
            .patch({ is_rental_active: false, cancelled_at: now });
    }
};

const cancelListings = async ({ listingsToCancel }) => {
    if (listingsToCancel.length === 0) {
        return;
    }
    for (const listingToCancel of listingsToCancel) {
        await UserRentalListings.query()
            .where({ id: listingToCancel.id })
            .patch({
                cancelled_at: listingToCancel.cancelled_at,
            });
    }
};

const patchCancelledRecords = async ({ users_id }) => {
    const timeNow = new Date().getTime();
    const listings = await UserRentalListings.query()
        .where('user_rental_listings.users_id', users_id)
        .where('user_rental_listings.is_rental_active', true)
        .whereNotNull('user_rental_listings.cancelled_at')
        .join(
            'user_rentals',
            'user_rental_listings.id',
            'user_rentals.user_rental_listing_id'
        )
        .select(
            'user_rental_listings.*',
            'user_rentals.id',
            'user_rentals.user_rental_listing_id'
        );

    listings.forEach((listing) => {
        listing.user_rental_id = listing.id;
        listing.id = listing.user_rental_listing_id;
    });

    const oneDayInMs = 86400000;
    const listingIdsToMarkInactive = [];
    const rentalIdsToMarkInactive = [];
    listings.forEach((listing) => {
        if (timeNow - listing.cancelled_at.getTime() > oneDayInMs) {
            // it has been 1 day since this listing was cancelled
            listingIdsToMarkInactive.push(listing.id);
            rentalIdsToMarkInactive.push(listing.user_rental_id);
        }
    });

    let chunks = listingIdsToMarkInactive;
    if (listingIdsToMarkInactive.length > 998) {
        chunks = _.chunk(listingIdsToMarkInactive, 998);
    }
    // ie it was unchanged
    if (chunks.length === listingIdsToMarkInactive.length) {
        chunks = [chunks];
    }

    for (const idChunk of chunks) {
        await UserRentalListings.query()
            .whereIn('id', idChunk)
            .patch({ is_rental_active: false });
    }

    const rentals = await UserRentals.query()
        .where({
            users_id,
            is_rental_active: true,
        })
        .whereNotNull('cancelled_at');
    rentals.forEach((rentals) => {
        if (timeNow - rentals.cancelled_at.getTime() > oneDayInMs) {
            // it has been 1 day since this rental was cancelled
            // we should update the database to reflect that...
            rentalIdsToMarkInactive.push(rentals.id);
        }
    });

    chunks = rentalIdsToMarkInactive;
    if (rentalIdsToMarkInactive.length > 998) {
        chunks = _.chunk(rentalIdsToMarkInactive, 998);
    }
    // ie it was unchanged
    if (chunks.length === rentalIdsToMarkInactive.length) {
        chunks = [chunks];
    }

    for (const idChunk of chunks) {
        await UserRentals.query()
            .whereIn('id', idChunk)
            .patch({ is_rental_active: false });
    }
};

module.exports = {
    handleMissedRentalIdsToCancel,
    updateListingsAsActiveRentals,
    patchRentalsToCancel,
    insertRentalsFromNewListings,
    insertNewListings,
    markRentalsInactive,
    cancelListings,
    patchCancelledRecords,
};
