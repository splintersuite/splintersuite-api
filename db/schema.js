const { Model } = require('objection');
const knexConfig = require('./index');

Model.knex(knexConfig);

export default Model;

class DailyEarnings extends Model {
    static get tableName() {
        return 'daily_earnings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'timestamp',
                'users_id',
                'dec_start',
                'dec_end',
                'num_rentals',
                'return',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                timestamp: { type: 'dateTime' },
                dec_start: { type: 'number' },
                dec_end: { type: 'number' },
                num_rentals: { type: 'number' },
                return: { type: 'number' },
            },
        };
    }

    static get relationMappings() {
        return {
            user_daily_earnings: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'daily_earnings.users_id',
                    to: 'users.id',
                },
            },
        };
    }
}

class UserRentalListings extends Model {
    static get tableName() {
        return 'user_rental_listings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'users_id',
                'created_at',
                'card_uid',
                'level',
                'rental_id',
                'price',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                created_at: { type: 'dateTime' },
                cancelled_at: { type: 'dateTime' },
                card_uid: { type: 'string' },
                level: { type: 'integer' },
                rental_id: { type: 'string' },
                price: { type: 'number' },
            },
        };
    }

    static get relationMappings() {
        return {
            user_user_rental_listings: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'user_rental_listings.users_id',
                    to: 'users.id',
                },
            },
        };
    }
}

class UserRentals extends Model {
    static get tableName() {
        return 'user_rentals';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: [
                'created_at',
                'rented_at',
                'player_rented_to',
                'card_detail_id',
                'level',
                'card_uid',
                'rental_id',
                'price',
            ],
            properties: {
                id: { type: 'string' },
                users_id: { type: 'string' },
                created_at: { type: 'dateTime' },
                rented_at: { type: 'dateTime' },
                cancelled_at: { type: 'dateTime' },
                player_rented_to: { type: 'string' },
                card_detail_id: { type: 'string' },
                level: { type: 'string' },
                card_uid: { type: 'string' },
                rental_id: { type: 'string' },
                is_active_yn: { type: 'string' },
                price: { type: 'number' },
            },
        };
    }

    static get relationMappings() {
        return {
            user_user_rental_listings: {
                relation: Model.BelongsToOneRelation,
                modelClass: Users,
                join: {
                    from: 'user_rentals.users_id',
                    to: 'users.id',
                },
            },
        };
    }
}

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
                start_date: { type: 'dateTime' },
                end_date: { type: 'dateTime' },
            },
        };
    }
}

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
                install_date: { type: 'dateTime' },
            },
        };
    }
}

module.exports = {
    MarketRentalPrices,
    MarketRentalListings,
    Users,
    DailyEarnings,
    UserRentalListings,
    UserRentals,
    Brawls,
    Seasons,
    Installs,
};
