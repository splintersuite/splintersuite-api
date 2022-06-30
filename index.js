const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const cuid = require('cuid');
const pino = require('pino-http');

const util = require('./src/util/index');
const logger = require('./src/util/pinologger');
const { requestId } = require('./src/middlewares/helpers');
const checkSignature = require('./src/middlewares/checkSignature');
const users = require('./src/routes/users');
const invoices = require('./src/routes/invoices');
const market = require('./src/routes/market');

const app = express();
const PORT = 6900;

app.use(helmet());
//app.use(checkSignature);
app.use(bodyParser.json());
app.use('*', cors());
app.use(pino({ logger })); // this makes it so the http logger uses same settings as our app logger

app.use('/api/users', users);
app.use('/api/invoices', invoices);
app.use('/api/market', market);

app.use(util.logErrors);
app.use(requestId(cuid));

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
