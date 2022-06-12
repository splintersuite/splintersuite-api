import Model from '../../db/Model';

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
                start_date: { type: 'dateTime' },
                end_date: { type: 'dateTime' },
            },
        };
    }
}

export default Seasons;
