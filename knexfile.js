export default {
    development: {
        client: 'pg',
        connection: 'postgres://localhost/db_name',
        migrations: {
            tableName: 'dev_knex_migrations',
        },
    },
    staging: {
        client: 'pg',
        connection: 'postgres://localhost/db_name',
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'staging_knex_migrations',
        },
    },

    production: {
        client: 'pg',
        connection: 'postgres://localhost/db_name',
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'prod_knex_migrations',
        },
    },
};
