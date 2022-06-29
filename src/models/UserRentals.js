const Model = require('../../db/model');
const Users = require('./Users');
const UserRentalListings = require('./UserRentalListings');

class UserRentals extends Model {
    static get tableName() {
        return 'user_rentals';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'users_id',
                'user_rental_listing_id',
                'rented_at',
                'next_rental_payment',
                'last_rental_payment',
                'price',
                'player_rented_to',
                'rental_tx',
                'sell_trx_id',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                user_rental_listing_id: { type: 'string' },
                rented_at: { type: 'object', format: 'date-time' },
                next_rental_payment: { type: 'object', format: 'date-time' },
                last_rental_payment: { type: 'object', format: 'date-time' },
                price: { type: 'number' },
                player_rented_to: { type: 'string' },
                rental_tx: { type: 'string' },
                sell_trx_id: { type: 'string' },
            },
        };
    }

    static get relationMappings() {
        return {
            user_user_rentals: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'user_rentals.users_id',
                    to: 'users.id',
                },
            },
            user_user_rental_listings: {
                relation: Model.BelongsToOneRelation,
                modelClass: UserRentalListings,
                join: {
                    from: 'user_rentals.user_rental_listing_id',
                    to: 'user_rental_listings.id',
                },
            },
        };
    }
}

module.exports = UserRentals;
