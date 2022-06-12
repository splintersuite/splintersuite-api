import Model from '../../db/Model';

class DailyEarnings extends Model {
    static get tableName() {
        return 'daily_earnings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'timestamp',
                'users_id',
                'dec_start',
                'dec_end',
                'num_rentals',
                'return',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                timestamp: { type: 'dateTime' },
                dec_start: { type: 'number' },
                dec_end: { type: 'number' },
                num_rentals: { type: 'number' },
                return: { type: 'number' },
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
