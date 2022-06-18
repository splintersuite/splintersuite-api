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
        pool: {
            min: 5,
            max: 30,
            afterCreate(conn, done) {
                conn.query('SET timezone="UTC";', (err) => {
                    if (err) {
                        // first query failed, return error and don't try to make next query
                        done(err, conn);
                    } else {
                        // do the second query...
                        conn.query('SELECT 1;', (err) => {
                            // if err is not falsy, connection is discarded from pool
                            // if connection acquire was triggered by a query the error is passed to query promise
                            done(err, conn);
                        });
                    }
                });
            },
        },
        migrations: {
            directory: './db/migrations',
        },
        seeds: {
            directory: './db/seeds',
        },
        debug: true,
    },
    onUpdateTrigger: (table) => `
        CREATE TRIGGER ${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE PROCEDURE on_update_timestamp();
      `,
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
