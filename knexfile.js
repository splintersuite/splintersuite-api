import dotenv from 'dotenv';
dotenv.config();

export default {
    development: {
        client: 'pg',
        connection: {
            connectionString: process.env.DB_CONNECTION,
            ssl: {
                rejectUnauthorized: false,
            },
        },
        migrations: {
            directory: './db/migrations',
        },
    },
    // staging: {
    //     client: 'pg',
    //     connection: 'postgres://localhost/db_name',
    //     pool: {
    //         min: 2,
    //         max: 10,
    //     },
    //     migrations: {
    //         directory: './db/migrations',
    //     },
    // },
    // production: {
    //     client: 'pg',
    //     connection: 'postgres://localhost/db_name',
    //     pool: {
    //         min: 2,
    //         max: 10,
    //     },
    //     migrations: {
    //         directory: './db/migrations',
    //     },
    // },
};
