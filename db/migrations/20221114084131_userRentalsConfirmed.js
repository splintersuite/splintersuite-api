/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const DROP_DEFAULT =
    'ALTER TABLE ONLY `user_rentals` ALTER COLUMN `confirmed` DROP DEFAULT';

exports.up = function (knex) {
    return knex.schema.raw(DROP_DEFAULT);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable('user_rentals', (t) => {
        t.boolean('confirmed').nullable(); // TNT NOTE: we are trying to make the exports.down work out, only deviating because it not being default to no (rather than override it with .defaultsTo, is causing all sorts of issues)
    });

    //   .table('user_rentals', (t) => {
    //     t.string('sell_trx_hive_id').notNullable().defaultTo('N');
    //     t.boolean('confirmed').nullable().defaultTo(null);
    // })
};
