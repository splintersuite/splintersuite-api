import Model from '../../db/model.js';
import UserRentals from './UserRentals.js';
import Users from './Users.js';

class UserRentalListings extends Model {
    static get tableName() {
        return 'user_rental_listings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'users_id',
                'card_uid',
                'level',
                'sell_trx_id',
                'price',
                'card_detail_id',
                'is_gold',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                created_at: { type: 'object', format: 'date-time' },
                updated_at: { type: 'object', format: 'date-time' },
                cancelled_at: { type: 'object', format: 'date-time' },
                card_uid: { type: 'string' },
                card_detail_id: { type: 'integer' },
                is_rental_active: { type: 'boolean' },
                level: { type: 'integer' },
                sell_trx_id: { type: 'string' },
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

export default UserRentalListings;
