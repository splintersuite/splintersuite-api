const knexfile = require('../../knexfile');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .table('user_rentals', (t) => {
            t.dropColumn('confirmed');
        })
        .table('market_rental_prices', (t) => {
            t.dropColumn('xp');
        })
        .table('user_rentals', (t) => {
            t.boolean('confirmed').nullable().defaultTo(null);
        })
        .createTable('market_price_run', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true);
            t.dateTime('started_at').nullable();
            t.dateTime('finished_at').nullable();
            t.boolean('completed').nullable().defaultTo(null);
            t.unique('id');
        })
        .table('market_rental_prices', (t) => {
            t.uuid('price_run_id').references('market_price_run.id').nullable(); // ideally would be fine but, we don't want to do this imo, can always use current method as a backup
        })
        .then(() => knex.raw(knexfile.onUpdateTrigger('market_price_run')));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .table('user_rentals', (t) => {
            t.dropColumn('confirmed');
        })
        .table('market_rental_prices', (t) => {
            t.integer('xp').nullable();
        })
        .table('user_rentals', (t) => {
            t.boolean('confirmed').notNullable().defaultTo(false);
        })
        .table('market_rental_prices', (t) => {
            t.dropColumn('price_run_id');
        })
        .dropTableIfExists('market_price_run');
};