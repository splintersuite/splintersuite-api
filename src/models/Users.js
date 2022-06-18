import Model from '../../db/model.js';
import UserRentalListings from './UserRentalListings.js';
import DailyEarnings from './DailyEarnings.js';
import Invoices from './Invoices.js';
import UserRentals from './UserRentals.js';

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
            },
        };
    }

    // https://dev.to/aspittel/objection--knex--painless-postgresql-in-your-node-app--6n6
    static get relationMappings() {
        return {
            user_rentals: {
                relation: Model.HasManyRelation,
                modelClass: UserRentalListings,
                join: {
                    from: 'users.id',
                    to: 'user_rental_listings.users_id',
                },
            },
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
        };
    }
}

export default Users;
