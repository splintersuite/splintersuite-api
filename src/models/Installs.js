import Model from '../../db/model.js';

class Installs extends Model {
    static get tableName() {
        return 'installs';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['app_version', 'install_date'],
            properties: {
                id: { type: 'string' },
                app_version: { type: 'number' },
                install_date: { type: 'object', format: 'date-time' },
            },
        };
    }
}

export default Installs;
