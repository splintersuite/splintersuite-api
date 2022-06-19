import _ from 'lodash';
import UserRentals from '../../models/UserRentals.js';
import UserRentalListings from '../../models/UserRentalListings.js';

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
    for (const rentalToCancel of rentalsToCancel) {
        await UserRentals.query()
            .where({ id: rentalToCancel.db_rental_id })
            .patch({
                rental_tx: rentalToCancel.rental_tx,
                sell_trx_id: rentalToCancel.sell_trx_id,
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

export default {
    handleMissedRentalIdsToCancel,
    updateListingsAsActiveRentals,
    patchRentalsToCancel,
    insertRentalsFromNewListings,
    insertNewListings,
};
