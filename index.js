import express from 'express';
import 'express-async-errors';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import users from './src/routes/users.js';
import util from './src/util/index.js';
import checkSignature from './src/middlewares/checkSignature';

const app = express();
const PORT = 6900;

app.use(helmet());
app.use(checkSignature);
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('combined'));

app.use('/api/users', users);
app.use(util.logErrors);

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
