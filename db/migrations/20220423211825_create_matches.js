/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    console.log('migrations.latest is called');

    // get "https://api2.splinterlands.com/market/for_rent_by_card
    // with params card_id: int, edition: int, gold: bool = False"
    return knex.schema
        .createTable('rentals', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.string('result').notNullable();
            t.boolean('existing').notNullable();
            t.unique('result');
        })
        .createTable('match_types', (t) => {
            // IE this is a ranked game or brawl game
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.string('name').notNullable();
            t.boolean('existing').notNullable(); // this is if it is still relevant, once it goes out of service then it isn't worth keepiung up
            t.unique('name');
        })
        .createTable('color_types', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.string('name').notNullable();
            t.string('splinter_name').notNullable();
            t.unique('name');
        })
        .createTable('battle_leagues', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.integer('league_number').notNullable();
            t.string('league_name').notNullable();
            t.boolean('existing').notNullable(); // this is if it is still relevant, once it goes out of service then it isn't worth keepiung up
            t.unique('league_number');
        })
        .createTable('rulesets', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.string('name').notNullable();
            t.boolean('active').notNullable();
            t.unique('name');
        })
        .createTable('battles', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.dateTime('createdDate').notNullable(); // date actually created the match with timestamp
            t.string('battle_queue_id_1').nullable();
            t.string('battle_queue_id_2').nullable();
            t.string('color').references('color_types.name').notNullable(); // x
            t.string('match_type').references('match_types.name').notNullable(); // x
            t.string('player_name').notNullable();
            t.string('ruleset_1').references('rulesets.name').notNullable(); // x
            t.string('ruleset_2').references('rulesets.name').notNullable(); // x
            t.string('result').references('match_results.result').notNullable();
            t.integer('league')
                .references('battle_leagues.league_number')
                .notNullable();
            t.integer('mana_cap').notNullable();
            t.unique(['createdDate', 'player_name']); // TNT NOTE: I think this is how we prevent duplicates?
        })
        .createTable('summoners', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.integer('card_detail_id').notNullable();
            t.integer('level').notNullable();
            t.uuid('battle_id').references('battles.id').notNullable();
        })
        .createTable('monsters', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.integer('card_detail_id').notNullable();
            t.integer('level').notNullable();
            t.integer('position').notNullable();
            t.uuid('battle_id').references('battles.id').notNullable();
        })
        .createTable('playable_splinters', (t) => {
            t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            t.dateTime('createdAt').notNullable();
            t.dateTime('updatedAt').nullable();
            t.string('is_fire_available_yn').defaultTo('N');
            t.string('is_earth_available_yn').defaultTo('N');
            t.string('is_life_available_yn').defaultTo('N');
            t.string('is_death_available_yn').defaultTo('N');
            t.string('is_dragon_available_yn').defaultTo('N');
            t.string('is_water_available_yn').defaultTo('N');
            t.uuid('battle_id').references('battles.id').notNullable();
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    console.log('migrations rollback is called');
    return knex.schema
        .dropTableIfExists('summoners')
        .dropTableIfExists('monsters')
        .dropTableIfExists('playable_splinters')
        .dropTableIfExists('battles')
        .dropTableIfExists('match_results')
        .dropTableIfExists('battle_leagues')
        .dropTableIfExists('rulesets')
        .dropTableIfExists('color_types')
        .dropTableIfExists('match_types');
};
