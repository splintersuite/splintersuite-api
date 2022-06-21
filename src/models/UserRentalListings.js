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
                'card_uid',
                'level',
                'sell_trx_id',
                'source',
                'price',
                'card_detail_id',
                'is_gold',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                sl_created_at: { type: 'object', format: 'date-time' },
                cancelled_at: { type: ['object', 'null'], format: 'date-time' },
                card_uid: { type: 'string' },
                card_detail_id: { type: 'integer' },
                is_rental_active: { type: 'boolean' },
                level: { type: 'integer' },
                sell_trx_id: { type: 'string' },
                source: { type: 'string' },
                is_gold: { type: 'boolean' },
                price: { type: 'number' },
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
