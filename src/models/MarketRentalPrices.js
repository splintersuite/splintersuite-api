const Model = require('../../db/model');

class MarketRentalPrices extends Model {
    static get tableName() {
        return 'market_rental_prices';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'period_start_time',
                'period_end_time',
                'card_detail_id',
                'level',
                'price_currency',
                'is_gold',
                'aggregation_type',
            ],
            properties: {
                id: { type: 'string' },
                created_at: { type: 'object', format: 'date-time' },
                period_start_time: { type: 'object', format: 'date-time' },
                period_end_time: { type: 'object', format: 'date-time' },
                card_detail_id: { type: 'integer' },
                level: { type: 'integer' },
                color: { type: 'string' }, // more like an enumeration
                price_currency: { type: 'string' },
                is_gold: { type: 'boolean' },
                aggregation_type: { type: 'string' },
                volume: { type: 'number' },
                avg: { type: 'number' },
                low: { type: 'number' },
                high: { type: 'number' },
                median: { type: 'number' },
                std_dev: { type: 'number' },
            },
        };
    }
}

module.exports = MarketRentalPrices;
