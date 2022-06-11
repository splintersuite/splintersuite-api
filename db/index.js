import dotenv from 'dotenv';
import knex from 'knex';
import knexfile from '../knexfile.js';

dotenv.config();
const config = knexfile[process.env.NODE_ENV];

export default knex(config);
