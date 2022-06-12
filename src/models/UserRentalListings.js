import Model from '../../db/Model';
import Users from './Users';

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
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                created_at: { type: 'dateTime' },
                cancelled_at: { type: 'dateTime' },
                card_uid: { type: 'string' },
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
