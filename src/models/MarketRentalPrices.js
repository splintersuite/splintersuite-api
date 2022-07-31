const Model = require('../../db/model');
const MarketPriceRuns = require('./MarketPriceRuns');

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
                'volume',
                'price_currency',
                'is_gold',
                'aggregation_type',
                'edition',
            ],
            properties: {
                id: { type: 'string' },
                period_start_time: { type: 'object', format: 'date-time' },
                period_end_time: { type: 'object', format: 'date-time' },
                card_detail_id: { type: 'integer' },
                level: { type: 'integer' },
                edition: { type: 'integer' }, // more like an enumeration
                price_currency: { type: 'string' },
                is_gold: { type: 'boolean' },
                aggregation_type: { type: 'string' },
                volume: { type: 'number' },
                avg: { type: 'number' },
                low: { type: 'number' },
                high: { type: 'number' },
                median: { type: 'number' },
                std_dev: { type: 'number' },
                price_run_id: { type: 'string' },
            },
        };
    }

    static get relationMappings() {
        return {
            market_price_run: {
                relation: Model.BelongsToOneRelation,
                modelClass: MarketPriceRuns,
                join: {
                    from: 'market_rental_prices.price_run_id',
                    to: 'market_price_runs.id',
                },
            },
        };
    }
}

module.exports = MarketRentalPrices;
