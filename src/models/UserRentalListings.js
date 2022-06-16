import Model from '../../db/model.js';
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
                'created_at',
                'card_uid',
                'level',
                'rental_id',
                'price',
                'card_detail_id',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                created_at: { type: 'object', format: 'date-time' },
                rented_at: { type: 'object', format: 'date-time' },
                cancelled_at: { type: 'object', format: 'date-time' },
                card_uid: { type: 'string' },
                player_rented_to: { type: 'string' },
                card_detail_id: { type: 'integer' },
                is_rental_active: { type: 'boolean' },
                level: { type: 'integer' },
                rental_id: { type: 'string' },
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
        };
    }
}

export default UserRentalListings;
