/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

// https://stackoverflow.com/questions/68435423/how-to-change-datatype-of-a-column-in-postgresql-database-using-knex-migration
// https://knexjs.org/guide/schema-builder.html#chainable-methods
// https://stackoverflow.com/questions/42549842/modify-column-datatype-in-knex-migration-script
const DROP_DEFAULT =
    'ALTER TABLE ONLY `market_price_runs` ALTER COLUMN `completed` DROP DEFAULT';

exports.up = function (knex) {
    return knex.schema.raw(DROP_DEFAULT);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable('market_price_runs', (t) => {
        t.boolean('completed').nullable().alter(); // we are trying to make the exports.down work out, only deviating because it not being default to no (rather than override it with .defaultsTo, is causing all sorts of issues)
    });
};
