import Model from '../../db/model.js';
import Users from './Users.js';

class DailyEarnings extends Model {
    static get tableName() {
        return 'daily_earnings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['earnings_date', 'users_id', 'earnings', 'num_rentals'],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                earnings_date: { type: 'object', format: 'date-time' },
                created_at: { type: 'object', format: 'date-time' },
                updated_at: { type: 'object', format: 'date-time' },
                num_rentals: { type: 'number' },
                earnings: { type: 'number' },
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

export default DailyEarnings;
