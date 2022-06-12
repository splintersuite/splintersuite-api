import Model from '../model';

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
                created_at: { type: 'dateTime' },
                timestamp: { type: 'dateTime' },
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
