const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const cuid = require('cuid');

const users = require('./src/routes/users');
const { requestId } = require('./src/middlewares/helpers');
const rentals = require('./src/routes/rentals');
const invoices = require('./src/routes/invoices');
const rentalListings = require('./src/routes/rentalListings');
const util = require('./src/util/index');
const checkSignature = require('./src/middlewares/checkSignature');
const pino = require('pino-http')();

const app = express();
const PORT = 6900;

app.use(helmet());
app.use(checkSignature);
app.use(bodyParser.json());
app.use('*', cors());
app.use(pino);
app.use('/api/users', users);
app.use('/api/rentals', rentals);
app.use('/api/invoices', invoices);
app.use('/api/rentallistings', rentalListings);
app.use(util.logErrors);
app.use(requestId(cuid));

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
