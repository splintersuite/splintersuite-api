const UserRentalListings = require('../../models/UserRentalListings');
const splinterlandsService = require('../../services/splinterlands');
const { SPLINTERLANDS_API } = require('./types');
const _ = require('lodash');

const updateListingsInDb = async ({ users_id, username, cardDetailsObj }) => {
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

    const dbListingsNotRented = dbListings.filter(
        ({ is_rental_active }) => !is_rental_active
    );

    const apiListings = await splinterlandsService.getCollectionListings({
        username,
    });

    const listingsToInsert = [];
    // iterate through api listings to check vs dbListings
    apiListings.notRented.forEach((apiListing) => {
        const found = dbListingsNotRented.some(
            (dbListing) =>
                apiListing.sell_trx_id === dbListing.sell_trx_id &&
                apiListing.uid === dbListing.card_uid
        );
        if (!found) {
            listingsToInsert.push({
                users_id,
                sl_created_at: new Date(apiListing.market_created_date),
                cancelled_at: null,
                card_detail_id: apiListing.card_detail_id,
                level: apiListing.level,
                card_uid: apiListing.uid,
                sell_trx_id: apiListing.sell_trx_id, // also received  = require(the api as market_id
                price: Number(apiListing.buy_price),
                source: SPLINTERLANDS_API,
                is_rental_active: false,
                is_gold: apiListing.gold,
            });
        }
    });

    if (listingsToInsert.length > 0) {
        await UserRentalListings.query().insert(listingsToInsert);
    }

    return {
        dbListingsNotRented: _.concat(listingsToInsert, dbListingsNotRented),
        dbListingsRented: dbListings.filter(
            ({ is_rental_active }) => is_rental_active === true
        ),
        apiListings,
        insertedListings: listingsToInsert,
    };
};

module.exports = { updateListingsInDb };
