const knexfile = require('../../knexfile');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    console.log('create migration being called');
    return knex.schema
        .createTable('market_rental_prices', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true);
            // we'll be aggregating the data over some window
            t.dateTime('period_start_time').notNullable();
            t.dateTime('period_end_time').notNullable();
            t.integer('card_detail_id').notNullable();
            t.integer('level').notNullable(); // calculated by tnt's function
            t.integer('xp').notNullable();
            t.integer('volume').notNullable();
            t.integer('edition').notNullable();
            t.float('avg').nullable();
            t.float('low').nullable();
            t.float('high').nullable();
            t.float('median').nullable();
            t.float('std_dev').nullable();
            t.boolean('is_gold').notNullable();
            t.string('price_currency').notNullable();
            t.string('aggregation_type').notNullable();
            t.unique([
                'created_at',
                'aggregation_type',
                'card_detail_id',
                'level',
                'is_gold',
                'edition',
            ]);
        })
        .createTable('users', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true);
            t.string('username').notNullable();
            t.boolean('locked').notNullable().defaultTo(false);
            t.unique(['username']);
        })
        .createTable('daily_earnings', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.timestamps(true, true);
            t.dateTime('earnings_date').notNullable();
            t.float('earnings_dec').notNullable();
            t.float('bot_earnings_dec').notNullable();
            t.integer('num_rentals').notNullable();
            t.integer('bot_num_rentals').notNullable();
        })
        .createTable('user_rental_listings', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.dateTime('sl_created_at').notNullable();
            t.dateTime('cancelled_at').nullable();
            t.timestamps(true, true);
            t.integer('edition').notNullable();
            t.integer('card_detail_id').notNullable();
            t.integer('level').notNullable();
            t.float('price').notNullable();
            t.boolean('got_rented').notNullable().defaultTo(false);
            t.boolean('is_gold').notNullable();
            t.string('sell_trx_id').notNullable(); // assigned by splinterlands WHEN LISTED, is collection.market_id or activeRentals.sell_trx_id.  collection.market_id changes everytime you list a card for the first time (ie if its listed, you cancel and then list again, new market_id, doesn't change with relisting tho)
            t.string('source').notNullable(); // assigned by splinterlands WHEN LISTED
            t.string('card_uid').notNullable();
            t.unique(['sl_created_at', 'card_uid', 'sell_trx_id']); // TNT TODO: look into this
        }) // TNT NOTE: WE NEED TO MAKE ONE USER_RENTAL APPLICABLE TO MANY user_rental_listings imo
        .createTable('user_rentals', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.uuid('user_rental_listing_id')
                .references('user_rental_listings.id')
                .notNullable();
            t.timestamps(true, true);
            t.dateTime('rented_at').notNullable();
            t.dateTime('next_rental_payment').notNullable();
            t.dateTime('last_rental_payment').notNullable();
            t.float('price').notNullable();
            t.string('player_rented_to').notNullable();
            t.string('rental_tx').notNullable(); // this is collection.delegation_tx and activeRentals.rental_tx, when listing there is a collection placeholder @ sm_rental_payments`numbers4390245` + market_listing_status = parseInt(0) & market_listing_type === "RENT"
            t.string('sell_trx_id').notNullable(); // assigned by splinterlands WHEN LISTED, is collection.market_id or activeRentals.sell_trx_id
            t.unique([
                'users_id',
                'rental_tx',
                'sell_trx_id',
                'next_rental_payment',
                'user_rental_listing_id', // TBD IF WE CAN DO THIS
                //  'last_rental_payment',
            ]);
        })
        .createTable('brawls', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true);
            t.dateTime('start_date').notNullable();
            t.dateTime('end_date').notNullable();
            t.integer('brawl_id').notNullable();
            t.string('name').nullable();
            t.unique('end_date');
        })
        .createTable('seasons', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true);
            t.dateTime('start_date').nullable();
            t.dateTime('end_date').notNullable();
            t.integer('season_id').notNullable();
            t.string('season_name').nullable();
            t.unique('end_date');
        })
        .createTable('installs', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true);
            t.dateTime('app_version').notNullable();
            t.dateTime('install_date').notNullable();
        })
        .createTable('invoices', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.uuid('season_id').references('seasons.id').notNullable();
            t.dateTime('discounted_due_at').notNullable();
            t.timestamps(true, true);
            t.dateTime('due_at').notNullable();
            t.dateTime('paid_at').nullable();
            t.float('amount_due').notNullable();
            t.string('tx_id').nullable();
            t.string('season_name').nullable();
        })
        .then(() => knex.raw(knexfile.onUpdateTrigger('market_rental_prices')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('users')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('daily_earnings')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('user_rentals')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('user_rental_listings')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('brawls')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('seasons')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('installs')))
        .then(() => knex.raw(knexfile.onUpdateTrigger('invoices')));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    console.log('rolling back create migration');
    return knex.schema
        .dropTableIfExists('market_rental_prices')
        .dropTableIfExists('daily_earnings')
        .dropTableIfExists('user_rentals')
        .dropTableIfExists('user_rental_listings')
        .dropTableIfExists('invoices')
        .dropTableIfExists('users')
        .dropTableIfExists('brawls')
        .dropTableIfExists('seasons')
        .dropTableIfExists('installs');
};
