const Model = require('../../db/model');
const Users = require('./Users');

class CollectionListings extends Model {
    static get tableName() {
        return 'collection_listings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['users_id', 'card_uid'],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                rental_end_time: { type: 'number' },
                last_rental_payment_time: { type: 'number' },
                last_price_update_time: { type: 'number' },
                buy_price: { type: 'number' },
                is_rented: { type: 'boolean' },
                card_uid: { type: 'string' },
                last_sell_trx_id: { type: 'string' },
            },
        };
    }

    static get relationMappings() {
        return {
            user_listings: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'collection_listings.users_id',
                    to: 'users.id',
                },
            },
        };
    }
}

module.exports = CollectionListings;
