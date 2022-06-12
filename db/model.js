import knexInstance from './index';
// import addFormats from 'ajv-formats';

import { Model, AjvValidator } from 'objection';

//ajv.js.org/packages/ajv-formats.html
// https://github.com/Vincit/objection.js/issues/2147
// https://github.com/Vincit/objection.js/issues/2142

// class MyModel extends Model {
//     static createValidator() {
//         return new AjvValidator({
//             onCreateAjv: (ajv) => {
//                 addFormats(ajv, ['date', 'time']);
//             },
//             /* options: {
// 				allErrors: true,
// 				validateSchema: false,
// 				ownProperties: true,
// 				v5: true,
// 			}, */
//         });
//     }
// }

Model.knex(knexInstance);

export default Model;
