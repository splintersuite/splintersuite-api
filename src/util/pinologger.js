const pino = require('pino');
const dotenv = require('dotenv');
dotenv.config();

const logger = pino({
    level: process.env.PINO_LOG_LEVEL || 'debug',
    timestamp: pino.stdTimeFunctions.isoTime, // https://getpino.io/#/docs/api?id=pinostdtimefunctions-object
    // transport: {
    //     target: process.env.NODE_ENV === 'development' ? 'pino-pretty' : null,
    // },
});

module.exports = logger;

//const isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"`
