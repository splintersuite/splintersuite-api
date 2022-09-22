const Model = require('../../db/model');
const DailyEarnings = require('./DailyEarnings');
const Invoices = require('./Invoices');
const UserRentals = require('./UserRentals');
const CollectionListings = require('./CollectionListings');

class Users extends Model {
    static get tableName() {
        return 'users';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['username'],
            properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                locked: { type: 'boolean' },
                bot_loops: { type: 'number' },
            },
        };
    }

    // https://dev.to/aspittel/objection--knex--painless-postgresql-in-your-node-app--6n6
    static get relationMappings() {
        return {
            user_daily_earnings: {
                relation: Model.HasManyRelation,
                modelClass: DailyEarnings,
                join: {
                    from: 'users.id',
                    to: 'daily_earnings.users_id',
                },
            },
            users_invoices: {
                relation: Model.HasManyRelation,
                modelClass: Invoices,
                join: {
                    from: 'users.id',
                    to: 'invoices.users_id',
                },
            },
            users_users_rentals: {
                relation: Model.HasManyRelation,
                modelClass: UserRentals,
                join: {
                    from: 'users.id',
                    to: 'user_rentals.users_id',
                },
            },
            user_listings: {
                relation: Model.HasManyRelation,
                modelClass: CollectionListings,
                join: {
                    from: 'users.id',
                    to: 'collection_listings.users_id',
                },
            },
        };
    }
}

module.exports = Users;
