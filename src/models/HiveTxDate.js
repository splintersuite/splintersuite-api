const Model = require('../../db/model');

class HiveTxDate extends Model {
    static get tableName() {
        return 'hive_tx_date';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['hive_tx_id'],
            properties: {
                hive_created_at: { type: 'object', format: 'date-time' },
                recently_confirmed: { type: 'object', format: 'date-time' },
                hive_tx_id: { type: 'string' },
            },
        };
    }
}

module.exports = HiveTxDate;
