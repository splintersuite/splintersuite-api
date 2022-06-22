const pino = require('pino');

const whichToUse = () => {
    if (process.env.NODE_ENV === 'production') {
        //  return 'info'
        return 'info';
    } else {
        return 'debug';
    }
};

const isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"`;
const levelToUse = whichToUse();

// https://github.com/pinojs/pino/issues/674
// https://getpino.io/#/docs/api?id=opt-timestamp
// const logger = pino({ level: levelToUse, timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}` });

const logger = pino({ level: levelToUse, timestamp: isoTime });
module.exports = logger;
