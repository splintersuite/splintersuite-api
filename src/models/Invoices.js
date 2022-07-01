const Model = require('../../db/model');
const Users = require('./Users');

class Invoices extends Model {
    static get tableName() {
        return 'invoices';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'users_id',
                'discounted_due_at',
                'due_at',
                'start_date',
                'end_date',
                'amount_due',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                discounted_due_at: { type: 'object', format: 'date-time' },
                due_at: { type: 'object', format: 'date-time' },
                paid_at: { type: 'object', format: 'date-time' },
                start_date: { type: 'object', format: 'date-time' },
                end_date: { type: 'object', format: 'date-time' },
                amount_due: { type: 'number' },
                tx_id: { type: 'string' },
            },
        };
    }

    static get relationMappings() {
        return {
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

module.exports = Invoices;
