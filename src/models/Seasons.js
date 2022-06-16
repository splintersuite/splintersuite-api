import Model from '../../db/model.js';
import Invoices from './Invoices.js';

class Seasons extends Model {
    static get tableName() {
        return 'seasons';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['start_date', 'end_date'],
            properties: {
                id: { type: 'string' },
                start_date: { type: 'object', format: 'date-time' },
                end_date: { type: 'object', format: 'date-time' },
                name: { type: 'string' },
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

export default Seasons;
