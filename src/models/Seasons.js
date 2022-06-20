const Model = require('../../db/model');
const Invoices = require('./Invoices');

class Seasons extends Model {
    static get tableName() {
        return 'seasons';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['end_date'],
            properties: {
                id: { type: 'string' },
                start_date: { type: 'object', format: 'date-time' },
                end_date: { type: 'object', format: 'date-time' },
                season_name: { type: 'string' },
                season_id: { type: 'integer' },
            },
        };
    }

    static get relationMappings() {
        return {
            seasons_invoices: {
                relation: Model.HasManyRelation,
                modelClass: Invoices,
                join: {
                    from: 'seasons.id',
                    to: 'invoices.seasons_id',
                },
            },
        };
    }
}

module.exports = Seasons;
