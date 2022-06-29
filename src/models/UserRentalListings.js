const Model = require('../../db/model');
const UserRentals = require('./UserRentals');
const Users = require('./Users');

class UserRentalListings extends Model {
    static get tableName() {
        return 'user_rental_listings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'users_id',
                'sl_created_at',
                'edition',
                'card_detail_id',
                'level',
                'price',
                'got_rented',
                'is_gold',
                'sell_trx_id',
                'source',
                'card_uid',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                sl_created_at: { type: 'object', format: 'date-time' },
                cancelled_at: { type: ['object', 'null'], format: 'date-time' },
                edition: { type: 'integer' },
                card_detail_id: { type: 'integer' },
                level: { type: 'integer' },
                price: { type: 'number' },
                got_rented: { type: 'boolean' },
                is_gold: { type: 'boolean' },
                sell_trx_id: { type: 'string' },
                source: { type: 'string' },
                card_uid: { type: 'string' },
            },
        };
    }

    static get relationMappings() {
        return {
            user_user_rental_listings: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'user_rental_listings.users_id',
                    to: 'users.id',
                },
            },
            user_daily_earnings: {
                relation: Model.HasManyRelation,
                modelClass: UserRentals,
                join: {
                    from: 'user_rental_listings.id',
                    to: 'user_rentals.user_rental_listing_id',
                },
            },
        };
    }
}

module.exports = UserRentalListings;
