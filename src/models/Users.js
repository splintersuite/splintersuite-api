import Model from '../../db/Model';
import UserRentalListings from './UserRentalListings';
import DailyEarnings from './DailyEarnings';
import Invoices from './Invoices';

class Users extends Model {
    static get tableName() {
        return 'users';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['created_at', 'username'],
            properties: {
                id: { type: 'string' },
                created_at: { type: 'object', format: 'date-time' },
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
        };
    }
}

export default Users;
