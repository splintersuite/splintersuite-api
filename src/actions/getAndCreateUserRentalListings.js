const UserRentalListings = require('../models/UserRentalListings');

const createNewRentalListings = async ({
    // users_id,
    rentalListings,
}) => {
    rentalListings.forEach((rentalListing) => {
        rentalListing.sl_created_at = new Date(rentalListing.sl_created_at);
    });

    let users_id;
    if (rentalListings.length > 0) {
        users_id = rentalListings[0].users_id;
    }
    const today = new Date();
    const yday = new Date(today.setDate(today.getDate() - 1));
    const tmrw = new Date(today.setDate(today.getDate() + 1));
    const currentListings = await UserRentalListings.query()
        .where({
            users_id,
            cancelled_at: null,
        })
        .orWhereBetween('cancelled_at', [yday, tmrw]);

    const cardUIDstoRemove = [];
    currentListings.forEach((listing) => {
        rentalListings.forEach((newListing) => {
            if (
                listing.sell_trx_id === newListing.sell_trx_id &&
                listing.card_uid === newListing.card_uid
            ) {
                cardUIDstoRemove.push(newListing.card_uid);
            }
        });
    });

    const rentalListingsToInsert = rentalListings.filter(
        ({ card_uid }) => !cardUIDstoRemove.includes(card_uid)
    );

    if (rentalListingsToInsert > 0) {
        await UserRentalListings.query().insert(rentalListingsToInsert);
    }
    return;
};

module.exports = { createNewRentalListings };
