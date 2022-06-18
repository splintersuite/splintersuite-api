const knexfile = require('../../knexfile');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    console.log('knex up is called on _create migration');
    console.log('knex', knex);
    console.log('knex.raw', knex.raw);

    // get "https://api2.splinterlands.com/market/for_rent_by_card
    // with params card_id: int, edition: int, gold: bool = False"
    // https://api2.splinterlands.com/market/active_rentals?card_detail_id=162
    return knex.schema
        .createTable('market_rental_prices', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('created_at').defaultTo(knex.fn.now());
            // we'll be aggregating the data over some window
            t.dateTime('period_start_time').notNullable();
            t.dateTime('period_end_time').notNullable();
            t.integer('card_detail_id').notNullable();
            t.integer('level').notNullable(); // calculated by tnt's function
            // t.integer('xp').notNullable(); not sure if i want to save this
            // it would be interesting to see if high xp cards fetch higher rates than
            // lower xp cards in the same level because the chance of level up
            t.string('price_currency').notNullable();
            t.boolean('is_gold').notNullable(); // will be either Y or N rather than bool
            t.string('aggregaton_type').notNullable(); // 'ALL_OPEN_TRADES', 'TRADES_DURING_PERIOD'
            t.decimal('avg').nullable();
            t.decimal('low').nullable();
            t.decimal('high').nullable();
            t.decimal('median').nullable();
            t.decimal('std_dev').nullable();
            t.unique([
                'created_at',
                'aggregaton_type',
                'card_detail_id',
                'level',
                'is_gold',
            ]);
        })
        .createTable('market_rental_listings', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('created_at').defaultTo(knex.fn.now());
            // listings AT a point in time
            // it can almost certainly be assumed that the low is the newest listing
            t.dateTime('timestamp').nullable();
            t.integer('card_detail_id').notNullable();
            t.integer('level').notNullable();
            t.integer('num_listings').notNullable();
            t.boolean('is_gold').notNullable();
            t.decimal('avg').nullable();
            t.decimal('low').nullable();
            t.decimal('high').nullable();
            t.decimal('median').nullable();
            t.decimal('std_dev').nullable();
            t.unique(['created_at', 'card_detail_id', 'level', 'is_gold']);
        })
        .createTable('users', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.timestamps(true, true); // the same as the below
            // t.dateTime('created_at').defaultTo(knex.fn.now());
            t.string('username').notNullable();
            t.unique(['username']);
            // maybe add email to this??
            // or the user just logs in their with hive keychain.
        })
        .createTable('daily_earnings', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.dateTime('timestamp').notNullable();
            t.decimal('earnings').notNullable();
            t.integer('num_rentals').notNullable();
            // should add market rate for that card in the future...
        })
        .createTable('user_rental_listings', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.timestamps(true, true); // the same as the below
            // t.dateTime('created_at').defaultTo(knex.fn.now());
            // t.dateTime('updated_at').defaultTo(
            //     knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            // );
            t.dateTime('cancelled_at').nullable();
            t.integer('card_detail_id').notNullable(); // do we want this?  technically all of the data is stored on card_uid
            t.string('level').notNullable();
            t.string('card_uid').notNullable();
            t.string('sell_trx_id').notNullable(); // assigned by splinterlands WHEN LISTED
            t.decimal('price').notNullable();
            t.boolean('is_rental_active').notNullable().defaultTo(false);
            t.boolean('is_gold').notNullable();
            t.unique(['created_at', 'card_uid']);
        })
        .createTable('user_rentals', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('users_id').references('users.id').notNullable();
            t.uuid('user_rental_listing_id')
                .references('user_rental_listings.id')
                .notNullable();
            t.timestamps(true, true); // the same as the below
            // t.dateTime('created_at').defaultTo(knex.fn.now());
            // t.timestamp('updated_at').defaultTo(
            //     knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            // );
            t.dateTime('rented_at').notNullable();
            t.dateTime('cancelled_at').nullable();
            t.string('player_rented_to').notNullable(); // good to have to identify noobs
            t.string('rental_tx').notNullable();
            t.string('sell_trx_id').notNullable(); // assigned by splinterlands WHEN LISTED
            // shouldn't always reference user_rental_listings
            // in the case that we are hitting bids instead of offering
            t.boolean('is_rental_active').notNullable().defaultTo(false);
            t.decimal('price').notNullable();
            // handle for updated prices mid rental?  is that a new rental?
            t.unique(['users_id', 'created_at', 'rental_id']);
        })
        .createTable('brawls', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('start_date').notNullable();
            t.dateTime('end_date').notNullable();
            t.string('name').nullable();
        })
        .createTable('seasons', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('start_date').notNullable();
            t.dateTime('end_date').notNullable();
            t.string('season_name').nullable();
        })
        .createTable('installs', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('app_version').notNullable();
            t.dateTime('install_date').notNullable();
        })
        .createTable('invoices', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.uuid('user_id').references('users.id').notNullable();
            t.uuid('season_id').references('seasons.id').notNullable();
            t.dateTime('discounted_due_at').notNullable();
            t.timestamps(true, true); // the same as the below
            // t.dateTime('created_at').defaultTo(knex.fn.now());
            // t.dateTime('updated_at').defaultTo(
            //     knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            // );
            t.dateTime('due_at').notNullable();
            t.dateTime('paid_at').nullable();
            t.decimal('amount_due').notNullable();
            t.string('tx_id').nullable();
            t.string('season_name').nullable();
        })
        .then(() => knex.raw(knexfile.default.onUpdateTrigger('users')))
        .then(() => knex.raw(knexfile.default.onUpdateTrigger('invoices')))
        .then(() => knex.raw(knexfile.default.onUpdateTrigger('user_rentals')))
        .then(() =>
            knex.raw(knexfile.default.onUpdateTrigger('user_rental_listings'))
        );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    console.log('rolling back _create migration');
    return knex.schema
        .dropTableIfExists('market_rental_prices')
        .dropTableIfExists('market_rental_listings')
        .dropTableIfExists('rental_listings')
        .dropTableIfExists('daily_earnings')
        .dropTableIfExists('user_rentals')
        .dropTableIfExists('user_rental_listings')
        .dropTableIfExists('invoices')
        .dropTableIfExists('users')
        .dropTableIfExists('brawls')
        .dropTableIfExists('seasons')
        .dropTableIfExists('installs');
};
