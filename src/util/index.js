const logger = require('./pinologger');

const logErrors = (err, req, res, next) => {
    if (err) {
        logger.error(err.stack);
        res.status(500);
    }
};

module.exports = {
    logErrors,
};
