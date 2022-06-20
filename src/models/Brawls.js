const Model = require('../../db/model');

class Brawls extends Model {
    static get tableName() {
        return 'brawls';
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
                season_id: { type: 'string' },
            },
        };
    }
}

module.exports = Brawls;
