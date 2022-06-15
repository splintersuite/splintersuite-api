/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    console.log('knex up is called on _create migration');

    // get "https://api2.splinterlands.com/market/for_rent_by_card
    // with params card_id: int, edition: int, gold: bool = False"
    // https://api2.splinterlands.com/market/active_rentals?card_detail_id=162
    return (
        knex.schema
            .createTable('market_rental_prices', (t) => {
                t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
                t.dateTime('created_at').notNullable();
                // we'll be aggregating the data over some window
                t.dateTime('period_start_time').notNullable();
                t.dateTime('period_end_time').notNullable();
                t.integer('card_detail_id').notNullable();
                t.integer('level').notNullable(); // calculated by tnt's function
                // t.integer('xp').notNullable(); not sure if i want to save this
                // it would be interesting to see if high xp cards fetch higher rates than
                // lower xp cards in the same level because the chance of level up
                t.string('price_currency').notNullable();
                t.string('is_gold_yn').notNullable(); // will be either Y or N rather than bool
                t.string('aggregaton_type').notNullable(); // 'ALL_OPEN_TRADES', 'TRADES_DURING_PERIOD'
                t.decimal('avg').nullable();
                t.decimal('low').nullable();
                t.decimal('high').nullable();
                t.decimal('median').nullable();
                t.decimal('std_dev').nullable();
                t.unique(['created_at', 'card_detail_id', 'level']);
            })
            .createTable('market_rental_listings', (t) => {
                t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
                t.dateTime('created_at').notNullable();
                // listings AT a point in time
                // it can almost certainly be assumed that the low is the newest listing
                t.dateTime('timestamp').nullable();
                t.integer('card_detail_id').notNullable();
                t.integer('level').notNullable();
                t.integer('num_listings').notNullable();
                t.decimal('avg').nullable();
                t.decimal('low').nullable();
                t.decimal('high').nullable();
                t.decimal('median').nullable();
                t.decimal('std_dev').nullable();
                t.unique(['created_at', 'card_detail_id', 'level']);
            })
            .createTable('users', (t) => {
                t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
                t.dateTime('created_at').notNullable();
                t.string('username').notNullable();
                t.unique(['username']);
                // maybe add email to this??
                // or the user just logs in their with hive keychain.
            })
            .createTable('daily_earnings', (t) => {
                t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
                t.uuid('users_id').references('users.id').notNullable();
                t.dateTime('timestamp').notNullable();
                t.decimal('dec_start').notNullable();
                t.decimal('dec_end').notNullable();
                t.integer('num_rentals').notNullable();
                t.decimal('return').notNullable(); // expressed as a decimal dec_end/dec_start - 1
            })
            .createTable('user_rental_listings', (t) => {
                t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
                t.uuid('users_id').references('users.id').notNullable();
                t.dateTime('created_at').notNullable();
                t.dateTime('rented_at').nullable();
                t.dateTime('cancelled_at').nullable();
                t.string('player_rented_to').nullable(); // good to have to identify noobs
                t.integer('card_detail_id').notNullable(); // do we want this?  technically all of the data is stored on card_uid
                t.string('level').notNullable();
                t.string('card_uid').notNullable();
                t.string('rental_id').notNullable(); // assigned by splinterlands
                t.decimal('price').notNullable();
                t.string('rental_is_active_yn').notNullable().defaultTo('N');
                t.unique(['created_at', 'card_uid']);
            })
            // .createTable('user_rentals', (t) => {
            //     t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            //     t.uuid('users_id').references('users.id').notNullable();
            //     t.dateTime('created_at').notNullable();
            //     t.dateTime('rented_at').notNullable();
            //     t.dateTime('cancelled_at').nullable();
            //     t.string('player_rented_to').notNullable(); // good to have to identify noobs
            //     t.string('card_detail_id').notNullable(); // do we want this?  technically all of the data is stored on card_uid
            //     t.string('level').notNullable();
            //     t.string('card_uid').notNullable();
            //     t.string('rental_id').notNullable();
            //     // shouldn't always reference user_rental_listings
            //     // in the case that we are hitting bids instead of offering
            //     t.string('is_active_yn').notNullable().defaultTo('Y');
            //     t.decimal('price').notNullable();
            //     // handle for updated prices mid rental?  is that a new rental?
            //     t.unique(['users_id', 'created_at', 'card_uid']);
            // })
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
                t.string('name').nullable();
            })
            .createTable('installs', (t) => {
                t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
                t.dateTime('app_version').notNullable();
                t.dateTime('install_date').notNullable();
            })
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
        .dropTableIfExists('rental_listings')
        .dropTableIfExists('daily_earnings')
        .dropTableIfExists('user_rental_listings')
        .dropTableIfExists('user_rentals')
        .dropTableIfExists('users')
        .dropTableIfExists('brawls')
        .dropTableIfExists('seasons')
        .dropTableIfExists('installs');
};
