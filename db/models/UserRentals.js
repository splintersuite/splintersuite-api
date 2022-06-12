import Model from '../model';
import Users from './Users';

class UserRentals extends Model {
    static get tableName() {
        return 'user_rentals';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'created_at',
                'rented_at',
                'player_rented_to',
                'card_detail_id',
                'level',
                'card_uid',
                'rental_id',
                'price',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                created_at: { type: 'dateTime' },
                rented_at: { type: 'dateTime' },
                cancelled_at: { type: 'dateTime' },
                player_rented_to: { type: 'string' },
                card_detail_id: { type: 'string' },
                level: { type: 'string' },
                card_uid: { type: 'string' },
                rental_id: { type: 'string' },
                is_active_yn: { type: 'string' },
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
                    from: 'user_rentals.users_id',
                    to: 'users.id',
                },
            },
        };
    }
}

export default UserRentals;
