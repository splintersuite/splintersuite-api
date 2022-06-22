'use strict';

const axios = require('axios');
const axiosRetry = require('./axios_retry/axios_retry');
const logger = require('./pinologger');

const axiosInstance = axios.create({
    timeout: 5000,
});

axiosRetry.axiosRetry(axiosInstance, {
    retryDelay: (retryCount, error) => {
        logger.error(`retryCount: ${retryCount}`);
        logger.error(`retryDelay called with error: ${JSON.stringify(error)}`);
        logger.error(`error message is: ${error.message}`);
        return 500000;
    },
    retryCondition: (error) => {
        return (
            axiosRetry.isNetworkOrIdempotentRequestError ||
            axiosRetry.gotRateLimited(error)
        );
    },
    shouldResetTimeout: true,
});

module.exports = axiosInstance;
