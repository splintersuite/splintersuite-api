/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('market_rental_prices', (t) => {
        t.integer('edition').nullable(); // really should but notNullable() BUT this migration will set everything to null
        t.dropUnique([
            // remove this once youve run knex migrate:latest
            'created_at',
            'aggregation_type',
            'card_detail_id',
            'level',
            'is_gold',
        ]);
        t.unique([
            'created_at',
            'aggregation_type',
            'card_detail_id',
            'level',
            'is_gold',
            'edition',
        ]);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('market_rental_prices', (t) => {
        t.dropColumn('edition'); // calculated by tnt's function
        t.dropUnique([
            'created_at',
            'aggregation_type',
            'card_detail_id',
            'level',
            'is_gold',
            'edition',
        ]);
        t.unique([
            // remove this once youve run knex migrate:latest
            'created_at',
            'aggregation_type',
            'card_detail_id',
            'level',
            'is_gold',
        ]);
    });
};
