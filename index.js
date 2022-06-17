import express from 'express';
import 'express-async-errors';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import users from './src/routes/users.js';
import rentals from './src/routes/rentals.js';
import invoices from './src/routes/invoices.js';
import util from './src/util/index.js';
import checkSignature from './src/middlewares/checkSignature.js';

const app = express();
const PORT = 6900;

app.use(helmet());
app.use(checkSignature);
app.use(bodyParser.json());
app.use('*', cors());
app.use(morgan('combined'));

app.use('/api/users', users);
app.use('/api/rentals', rentals);
app.use('/api/invoices', invoices);
app.use(util.logErrors);

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
