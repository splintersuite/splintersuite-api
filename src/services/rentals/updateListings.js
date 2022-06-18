import UserRentalListings from '../../models/UserRentalListings';
import collectionFncs from '../../actions/getCollectionFncs';
import findCardLevel from '../calculateCardLevel.js';
import _ from 'lodash';

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

    const apiListings = await collectionFncs.getCollectionListings({
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
                level: findCardLevel({
                    id: apiListing.card_detail_id,
                    rarity: cardDetailsObj[apiListing.card_detail_id].rarity,
                    _xp: apiListing.xp,
                    gold: apiListing.gold,
                    edition: apiListing.edition,
                    tier: cardDetailsObj[apiListing.card_detail_id].tier,
                    alpha_xp: apiListing.alpha_xp,
                }),
                card_uid: apiListing.uid,
                sell_trx_id: apiListing.sell_trx_id, // also received from the api as market_id
                price: Number(apiListing.buy_price),
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

export default { updateListingsInDb };