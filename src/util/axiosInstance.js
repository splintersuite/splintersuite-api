'use strict';

const axios = require('axios');
const axiosRetry = require('../services/axios_retry/axios_retry');
const logger = require('./pinologger');

const axiosInstance = axios.create({
    timeout: 5000,
});

axiosRetry.axiosRetry(axiosInstance, {
    retryDelay: (retryCount, error) => {
        logger.error(`retryCount: ${retryCount}`);
        logger.error('retryDelay called with error: ', error);
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
