const Model = require('../../db/model');
const Users = require('./Users');

class UserRentals extends Model {
    static get tableName() {
        return 'user_rentals';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'users_id',
                'rented_at',
                'next_rental_payment',
                'last_rental_payment',
                'edition',
                'card_detail_id',
                'level',
                'xp',
                'price',
                'is_gold',
                'card_uid',
                'player_rented_to',
                'rental_tx',
                'sell_trx_id',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                rented_at: { type: 'object', format: 'date-time' },
                next_rental_payment: { type: 'object', format: 'date-time' },
                last_rental_payment: { type: 'object', format: 'date-time' },
                edition: { type: 'number' },
                card_detail_id: { type: 'number' },
                level: { type: 'number' },
                xp: { type: 'number' },
                price: { type: 'number' },
                is_gold: { type: 'boolean' },
                confirmed: { type: 'boolean' },
                card_uid: { type: 'string' },
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
        };
    }
}

module.exports = UserRentals;
