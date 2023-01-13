const knexfile = require('../../knexfile');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    console.log('create migration hive_tx_date');
    return knex.schema
        .createTable('hive_tx_date', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true);
            t.dateTime('hive_created_at').nullable();
            t.dateTime('recently_confirmed').nullable(); // TNT NOTE: when we delete/archive data, this is when we update this with the exact date imo.  Essentially allows a fallback I think, as compared to updating it every single time we confirm rentals (aka not needed imo)
            t.string('hive_tx_id').notNullable();
            t.unique('hive_tx_id');
        })
        .then(() => knex.raw(knexfile.onUpdateTrigger('hive_tx_date')));
};
// TNT TODO: reneg on this migration, and then we should remake it and add t.dateTime (recent_date_confirmation)
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists('hive_tx_date');
};

// TNT NOTE: we might want to add an index on user_rentals for the last_rental_payment
