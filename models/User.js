import { Model } from 'objection';
import knex from '../db';

Model.knex(knex);

class User extends Model {
    static get tableName() {
        return 'users';
    }

    static get relationMappings() {
        return {
            rentals: {
                relation: Model.HasManyRelation,
                modelClass: TradeTransactions,
                join: {
                    from: 'users.id',
                    to: 'rentals.user_id',
                },
            },
        };
    }
}

module.exports = User;
