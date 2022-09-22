const knexfile = require('../../knexfile');
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('collection_listings', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.timestamps(true, true);
            t.integer('rental_end_time').nullable();
            t.integer('last_rental_payment_time').nullable();
            t.integer('last_price_update_time').nullable();
            t.float('buy_price').nullable();
            t.boolean('is_rented').notNullable().defaultTo(false);
            t.string('card_uid').notNullable();
            t.string('last_sell_trx_id').nullable();
        })
        .then(() => knex.raw(knexfile.onUpdateTrigger('collection_listings')));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists('collection_listings');
};
