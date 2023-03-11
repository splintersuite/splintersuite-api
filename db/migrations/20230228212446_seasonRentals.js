/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('market_rental_prices', (t) => {
        t.string('rental_type').nullable().defaultTo(null);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('market_rental_prices', (t) => {
        t.dropColumn('rental_type');
    });
};
