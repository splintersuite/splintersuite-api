const Model = require('../../db/model');
const MarketRentalPrices = require('./MarketRentalPrices');

class MarketPriceRuns extends Model {
    static get table() {
        return 'market_price_runs';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['started_at'],
            properties: {
                id: { type: 'string' },
                started_at: { type: 'object', format: 'date-time' },
                finished_at: { type: 'object', format: 'date-time' },
                completed: { type: 'boolean' },
            },
        };
    }

    static get relationMappings() {
        return {
            market_price_run: {
                relation: Model.HasManyRelation,
                modelClass: MarketRentalPrices,
                join: {
                    from: 'market_price_runs.id',
                    to: 'market_rental_prices.price_run_id',
                },
            },
        };
    }
}

module.exports = MarketPriceRuns;
