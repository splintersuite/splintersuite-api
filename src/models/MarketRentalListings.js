import Model from '../../db/Model';

class MarketRentalListings extends Model {
    static get tableName() {
        return 'market_rental_listings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['created_at', 'card_detail_id', 'level', 'num_listings'],
            properties: {
                id: { type: 'string' },
                created_at: { type: 'object', format: 'date-time' },
                timestamp: { type: 'object', format: 'date-time' },
                card_detail_id: { type: 'integer' },
                level: { type: 'integer' },
                num_listings: { type: 'integer' },
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
