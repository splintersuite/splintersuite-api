const decrypt = require('../util/crypto');
const logger = require('../util/pinologger');
const checkSignature = (req, res, next) => {
    if (
        req.headers?.ss_access_token_iv &&
        req.headers?.ss_access_token_content
    ) {
        if (
            decrypt({
                iv: req.headers.ss_access_token_iv,
                content: req.headers.ss_access_token_content,
            }) === process.env.SECRET_MESSAGE
        ) {
            // authenticated
            return next();
        }
    }
    logger.warn(`unauthorized request`);
    // unauthenticated
    res.sendStatus(403);
};

module.exports = checkSignature;
