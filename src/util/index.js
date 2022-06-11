const logErrors = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500);
};

export default {
    logErrors,
};
