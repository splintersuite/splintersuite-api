const logErrors = (err, req, res, next) => {
    if (err) {
        console.error(err.stack);
        res.status(500);
    }
};

export default {
    logErrors,
};
