import Model from '../../db/model.js';
import Users from './Users.js';
import UserRentalListings from './UserRentalListings.js';

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
                'created_at',
                'rented_at',
                'played_rented_to',
                'rental_tx',
                'sell_trx_id',
                'price',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                user_rental_listing_id: { type: 'string' },
                created_at: { type: 'object', format: 'date-time' },
                rented_at: { type: 'object', format: 'date-time' },
                cancelled_at: { type: 'object', format: 'date-time' },
                player_rented_to: { type: 'string' },
                is_rental_active: { type: 'boolean' },
                rental_tx: { type: 'string' },
                sell_trx_id: { type: 'string' },
                price: { type: 'number' },
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

export default UserRentals;
