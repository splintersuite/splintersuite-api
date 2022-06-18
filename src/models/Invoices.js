import Model from '../../db/model.js';
import Users from './Users.js';
import Seasons from './Seasons.js';

class Invoices extends Model {
    static get tableName() {
        return 'invoices';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'discounted_due_at',
                'due_at',
                'amount_due',
                'users_id',
                'season_id',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                season_id: { type: 'string' },
                discounted_due_at: { type: 'object', format: 'date-time' },
<<<<<<< HEAD
                created_at: { type: 'object', format: 'date-time' },
                updated_at: { type: 'object', format: 'date-time' },
=======
>>>>>>> a6427d9e34355df0560e43d1b2514573c8238254
                due_at: { type: 'object', format: 'date-time' },
                paid_at: { type: 'object', format: 'date-time' },
                season_name: { type: 'string' },
                tx_id: { type: 'string' },
                amount_due: { type: 'number' },
            },
        };
    }

    static get relationMappings() {
        return {
            invoices_seasons: {
                relation: Model.BelongsToOneRelation,
                modelClass: Seasons,
                join: {
                    from: 'invoices.season_id',
                    to: 'seasons.id',
                },
            },
            invoices_users: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'invoices.users_id',
                    to: 'users.id',
                },
            },
        };
    }
}

export default Invoices;
