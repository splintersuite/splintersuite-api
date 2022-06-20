const Model = require('../../db/model');
const Users = require('./Users');
const Seasons = require('./Seasons');

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

module.exports = Invoices;
