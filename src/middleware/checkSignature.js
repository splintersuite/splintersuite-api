import { decrypt } from '../util/crypto.js';

const checkSignature = (req, res, next) => {
    try {
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
                next();
            }
        }
        // unauthenticated
        res.send(403);
    } catch (err) {
        next(err);
    }
};

export default checkSignature;
