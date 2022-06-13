import decrypt from '../util/crypto';

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
            next();
        }
    }
    // unauthenticated
    res.sendStatus(403);
};

export default checkSignature;
