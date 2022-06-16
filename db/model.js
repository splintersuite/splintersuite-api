import knexInstance from './index.js';
import addFormats from 'ajv-formats';

import { Model, AjvValidator } from 'objection';

class BaseModel extends Model {
    static createValidator() {
        return new AjvValidator({
            onCreateAjv: (ajv) => {
                addFormats(ajv);
            },
            options: {
                allErrors: true,
                strictNumbers: false,
                validateSchema: false,
                ownProperties: true,
                v5: true,
            },
        });
    }
}

BaseModel.knex(knexInstance);

export default BaseModel;
