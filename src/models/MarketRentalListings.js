import Model from '../../db/model.js';

class MarketRentalListings extends Model {
    static get tableName() {
        return 'market_rental_listings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['card_detail_id', 'level', 'num_listings, is_gold'],
            properties: {
                id: { type: 'string' },
                created_at: { type: 'object', format: 'date-time' },
                timestamp: { type: 'object', format: 'date-time' },
                card_detail_id: { type: 'integer' },
                level: { type: 'integer' },
                num_listings: { type: 'integer' },
                is_gold: { type: 'boolean' },
                avg: { type: 'number' },
                low: { type: 'number' },
                high: { type: 'number' },
                median: { type: 'number' },
                std_dev: { type: 'number' },
            },
        };
    }
}

export default MarketRentalListings;
