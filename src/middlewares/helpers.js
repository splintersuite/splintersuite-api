'use strict';
const logger = require('../util/pinologger');

const requestId = (generateId) => {
    return (req, res, next) => {
        const requestId = req.get('X-Request-Id') || generateId();
        res.set('X-Request-Id', requestId);
        req.logID = requestId;
        logger.debug(`request log ID is %O`, req.logID);
        next();
    };
};

module.exports = { requestId };
