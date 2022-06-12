import Model from 'objection';
import knexConfig from './index';

Model.knex(knexConfig);

export default Model;
