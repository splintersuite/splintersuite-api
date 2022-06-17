import express from 'express';
import 'express-async-errors';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import users from './src/routes/users.js';
import rentals from './src/routes/rentals.js';
<<<<<<< HEAD
import invoices from './src/routes/invoices.js';
=======
import invoices from './src/routes/invoices';
>>>>>>> a6427d9e34355df0560e43d1b2514573c8238254
import util from './src/util/index.js';
import checkSignature from './src/middlewares/checkSignature.js';

const app = express();
const PORT = 6900;

app.use(helmet());
//app.use(checkSignature);
app.use(bodyParser.json());
app.use('*', cors());
app.use(morgan('combined'));

app.use('/api/users', users);
app.use('/api/rentals', rentals);
app.use('/api/invoices', invoices);
<<<<<<< HEAD

=======
>>>>>>> a6427d9e34355df0560e43d1b2514573c8238254
app.use(util.logErrors);

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
