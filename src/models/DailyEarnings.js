const Model = require('../../db/model');
const Users = require('./Users');

class DailyEarnings extends Model {
    static get tableName() {
        return 'daily_earnings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'earnings_date',
                'users_id',
                'earnings_dec',
                'num_rentals',
                'bot_earnings_dec',
                'bot_num_rentals',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                earnings_date: { type: 'object', format: 'date-time' },
                created_at: { type: 'object', format: 'date-time' },
                updated_at: { type: 'object', format: 'date-time' },
                num_rentals: { type: 'number' },
                bot_num_rentals: { type: 'number' },
                earnings_dec: { type: 'number' },
                bot_earnings_dec: { type: 'number' },
            },
        };
    }

    static get relationMappings() {
        return {
            user_daily_earnings: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'daily_earnings.users_id',
                    to: 'users.id',
                },
            },
        };
    }
}

module.exports = DailyEarnings;
