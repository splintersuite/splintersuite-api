const test = (cardInfo) => {
    try {
        const {
            market_created_date,
            card_detail_id,
            level,
            uid,
            market_id,
            buy_price,
            gold,
        } = cardInfo;
        console.log('adjustCollectionRentalListingDataForDB start');
        const cardToInsert = {};
        // TNT NOTE: we need to actually get this ideally from the userData stored in the store
        cardToInsert.users_id = 'b6f60d73-c219-413b-9b9c-85833a757f4d';
        cardToInsert.sl_created_at = new Date(market_created_date);
        cardToInsert.card_detail_id = card_detail_id;
        cardToInsert.level = level;
        cardToInsert.card_uid = uid;
        cardToInsert.sell_trx_id = market_id;
        cardToInsert.price = buy_price;
        cardToInsert.is_gold = gold;
        console.log('cardToInsert is: ');
        console.log(cardToInsert);
        return cardToInsert;
    } catch (err) {
        console.error(
            `adjustCollectionRentalListingDataForDB error: ${err.message}`
        );
        throw err;
    }
};
const cardInfo = {
    player: 'xdww',
    uid: 'C7-433-4U46EV5BF4',
    card_detail_id: 433,
    xp: 11,
    gold: false,
    edition: 7,
    market_id: '3df13c7176256eb30b573e41f8931ac86c43b05c-4',
    buy_price: '22.901',
    market_listing_type: 'RENT',
    market_listing_status: 0,
    market_created_date: '2022-06-12T20:03:24.000Z',
    last_used_block: 65344348,
    last_used_player: 'hariton',
    last_used_date: '2022-06-17T12:53:12.289Z',
    last_transferred_block: null,
    last_transferred_date: null,
    alpha_xp: 0,
    delegated_to: null,
    delegation_tx: 'sm_rental_payments_65345500',
    skin: null,
    delegated_to_display_name: null,
    display_name: null,
    lock_days: 2,
    unlock_date: null,
    level: 4,
};
test(cardInfo);

// {
//     "player": "xdww",
//     "uid": "C7-433-4U46EV5BF4",
//     "card_detail_id": 433,
//     "xp": 11,
//     "gold": false,
//     "edition": 7,
//     "market_id": "3df13c7176256eb30b573e41f8931ac86c43b05c-4",
//     "buy_price": "22.901",
//     "market_listing_type": "RENT",
//     "market_listing_status": 0,
//     "market_created_date": "2022-06-12T20:03:24.000Z",
//     "last_used_block": 65344348,
//     "last_used_player": "hariton",
//     "last_used_date": "2022-06-17T12:53:12.289Z",
//     "last_transferred_block": null,
//     "last_transferred_date": null,
//     "alpha_xp": 0,
//     "delegated_to": null,
//     "delegation_tx": "sm_rental_payments_65345500",
//     "skin": null,
//     "delegated_to_display_name": null,
//     "display_name": null,
//     "lock_days": 2,
//     "unlock_date": null,
//     "level": 4
//     }
