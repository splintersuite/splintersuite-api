import decrypt from '../util/crypto';

const checkSignature = (req, res, next) => {
    try {
        console.log('req.headers', req.headers);
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
                next();
            }
        }
        // unauthenticated
        res.sendStatus(403);
    } catch (err) {
        next(err);
    }
};

export default checkSignature;
