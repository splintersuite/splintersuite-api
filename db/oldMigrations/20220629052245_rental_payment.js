/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('user_rentals', (t) => {
        t.dateTime('next_rental_payment').nullable(); // TNT NOTE: we are adding another column here specifically so that if they change next_rental_payment we will be fine, logically makes more sense too imo
        t.dateTime('last_rental_payment').nullable(); // should be notNullable when made into one migration file imo
        t.dropColumn('is_rental_active');
        t.dropUnique(['users_id', 'created_at', 'rental_tx', 'sell_trx_id']);
        t.unique([
            'users_id',
            'rental_tx',
            'sell_trx_id',
            'next_rental_payment',
            'last_rental_payment',
        ]);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('users_rentals', (t) => {
        t.dropColumn('next_rental_payment');
        t.dropColumn('last_rental_payment');
        t.dropUnique([
            'users_id',
            'rental_tx',
            'sell_trx_id',
            'next_rental_payment',
            'last_rental_payment',
        ]);
        t.boolean('is_rental_active').notNullable().defaultTo(false);
        t.unique(['users_id', 'created_at', 'rental_tx', 'sell_trx_id']);
    });
};
