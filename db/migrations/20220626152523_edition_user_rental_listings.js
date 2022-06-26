/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('user_rental_listings', (t) => {
        t.integer('edition').nullable(); // really should but notNullable() BUT this migration will set everything to null
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('user_rental_listings', (t) => {
        t.dropColumn('edition'); // calculated by tnt's function
    });
};
