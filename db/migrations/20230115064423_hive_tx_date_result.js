const knexfile = require('../../knexfile');
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    console.log('create migration hive_tx_date_result');
    return knex.schema.table('hive_tx_date', (t) => {
        t.boolean('confirmed').nullable().defaultTo(null);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('hive_tx_date', (t) => {
        t.dropColumn('confirmed');
    });
};
