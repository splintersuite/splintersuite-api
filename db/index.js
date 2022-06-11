import knex from 'knex';
import knexfile from '../knexfile';

const config = knexfile[process.env.NODE_ENV];

export default knex(config);
