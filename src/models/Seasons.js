const Model = require('../../db/model');

class Seasons extends Model {
    static get tableName() {
        return 'seasons';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['end_date', 'season_id'],
            properties: {
                id: { type: 'string' },
                start_date: { type: 'object', format: 'date-time' },
                end_date: { type: 'object', format: 'date-time' },
                season_name: { type: 'string' },
                season_id: { type: 'integer' },
            },
        };
    }
}

module.exports = Seasons;
