'use strict';

import isRetryAllowed from './is_retry_allowed.js';
import general from './general.js';

const namespace = 'axios-retry-sl-api';

/**
 * @param  {Error}  error
 * @return {boolean}
 */
const isNetworkError = (error) => {
    return (
        !error.response &&
        Boolean(error.code) && // Prevents retrying cancelled requests
        error.code !== 'ECONNABORTED' && // Prevents retrying timed out requests
        isRetryAllowed(error)
    ); // Prevents retrying unsafe errors
};

const SAFE_HTTP_METHODS = ['get', 'head', 'options'];
const IDEMPOTENT_HTTP_METHODS = SAFE_HTTP_METHODS.concat(['put', 'delete']);

/**
 * @param  {Error}  error
 * @return {boolean}
 */
const isRetryableError = (error) => {
    return (
        error.code !== 'ECONNABORTED' &&
        (!error.response ||
            (error.response.status >= 500 && error.response.status <= 599))
    );
};

/**
 * @param  {Error}  error
 * @return {boolean}
 */
const isSafeRequestError = (error) => {
    if (!error.config) {
        // Cannot determine if the request can be retried
        return false;
    }

    return (
        isRetryableError(error) &&
        SAFE_HTTP_METHODS.indexOf(error.config.method) !== -1
    );
};

/**
 * @param  {Error}  error
 * @return {boolean}
 */
const isIdempotentRequestError = (error) => {
    if (!error.config) {
        // Cannot determine if the request can be retried
        return false;
    }

    return (
        isRetryableError(error) &&
        IDEMPOTENT_HTTP_METHODS.indexOf(error.config.method) !== -1
    );
};

const gotRateLimited = (error) => {
    if (
        'response' in error &&
        typeof error.response !== 'undefined' &&
        'status' in error.response
    ) {
        return error.response.status === 429;
    }
    return false;
};

/**
 * @param  {Error}  error
 * @return {boolean | Promise}
 */
const isNetworkOrIdempotentRequestError = (error) => {
    return isNetworkError(error) || isIdempotentRequestError(error);
};

/**
 * @return {number} - delay in milliseconds, always 0
 */
const noDelay = () => {
    return 0;
};

/**
 * Initializes and returns the retry state for the given request/config
 * @param  {AxiosRequestConfig} config
 * @return {Object}
 */
const getCurrentState = (config) => {
    const currentState = config[namespace] || {};
    currentState.retryCount = currentState.retryCount || 0;
    config[namespace] = currentState;
    return currentState;
};

/**
 * Returns the axios-retry options for the current request
 * @param  {AxiosRequestConfig} config
 * @param  {AxiosRetryConfig} defaultOptions
 * @return {AxiosRetryConfig}
 */
const getRequestOptions = (config, defaultOptions) => {
    return { ...defaultOptions, ...config[namespace] };
};

/**
 * @param  {Axios} axios
 * @param  {AxiosRequestConfig} config
 */
const fixConfig = (axios, config) => {
    if (axios.defaults.agent === config.agent) {
        delete config.agent;
    }
    if (axios.defaults.httpAgent === config.httpAgent) {
        delete config.httpAgent;
    }
    if (axios.defaults.httpsAgent === config.httpsAgent) {
        delete config.httpsAgent;
    }
};

/**
 * Checks retryCondition if request can be retried. Handles it's retruning value or Promise.
 * @param  {number} retries
 * @param  {Function} retryCondition
 * @param  {Object} currentState
 * @param  {Error} error
 * @return {boolean}
 */
const shouldRetry = async (retries, retryCondition, currentState, error) => {
    const shouldRetryOrPromise =
        currentState.retryCount < retries && retryCondition(error);

    // This could be a promise
    if (typeof shouldRetryOrPromise === 'object') {
        try {
            await shouldRetryOrPromise;
            return true;
        } catch (_err) {
            return false;
        }
    }
    return shouldRetryOrPromise;
};

/**
 * Adds response interceptors to an axios instance to retry requests failed due to network issues
 *
 * @example
 *
 * import axios from 'axios';
 *
 * axiosRetry(axios, { retries: 3 });
 *
 * axios.get('http://example.com/test') // The first request fails and the second returns 'ok'
 *   .then(result => {
 *     result.data; // 'ok'
 *   });
 *
 * // Exponential back-off retry delay between requests
 * axiosRetry(axios, { retryDelay : axiosRetry.exponentialDelay});
 *
 * // Custom retry delay
 * axiosRetry(axios, { retryDelay : (retryCount) => {
 *   return retryCount * 1000;
 * }});
 *
 * // Also works with custom axios instances
 * const client = axios.create({ baseURL: 'http://example.com' });
 * axiosRetry(client, { retries: 3 });
 *
 * client.get('/test') // The first request fails and the second returns 'ok'
 *   .then(result => {
 *     result.data; // 'ok'
 *   });
 *
 * // Allows request-specific configuration
 * client
 *   .get('/test', {
 *     'axios-retry': {
 *       retries: 0
 *     }
 *   })
 *   .catch(error => { // The first request fails
 *     error !== undefined
 *   });
 *
 * @param {Axios} axios An axios instance (the axios object or one created from axios.create)
 * @param {Object} [defaultOptions]
 * @param {number} [defaultOptions.retries=3] Number of retries
 * @param {boolean} [defaultOptions.shouldResetTimeout=false]
 *        Defines if the timeout should be reset between retries
 * @param {Function} [defaultOptions.retryCondition=isNetworkOrIdempotentRequestError]
 *        A function to determine if the error can be retried
 * @param {Function} [defaultOptions.retryDelay=noDelay]
 *        A function to determine the delay between retry requests
 */
const axiosRetry = (axios, defaultOptions) => {
    axios.interceptors.request.use((config) => {
        const currentState = getCurrentState(config);
        currentState.lastRequestTime = Date.now();
        return config;
    });

    axios.interceptors.response.use(null, async (error) => {
        const { config } = error;

        // If we have no information to retry the request
        if (!config) {
            return Promise.reject(error);
        }

        const {
            retries = 3,
            retryCondition = isNetworkOrIdempotentRequestError,
            retryDelay = noDelay,
            shouldResetTimeout = false,
        } = getRequestOptions(config, defaultOptions);

        const currentState = getCurrentState(config);

        if (await shouldRetry(retries, retryCondition, currentState, error)) {
            currentState.retryCount += 1;
            const delay = retryDelay(currentState.retryCount, error);

            // Axios fails merging this configuration to the default configuration because it has an issue
            // with circular structures: https://github.com/mzabriskie/axios/issues/370
            fixConfig(axios, config);

            if (
                !shouldResetTimeout &&
                config.timeout &&
                currentState.lastRequestTime
            ) {
                const lastRequestDuration =
                    Date.now() - currentState.lastRequestTime;
                // Minimum 1ms timeout (passing 0 or less to XHR means no timeout)
                config.timeout = Math.max(
                    config.timeout - lastRequestDuration - delay,
                    1
                );
            }

            config.transformRequest = [(data) => data];

            //   return new Promise((resolve) => setTimeout(() => resolve(axios(config)), delay));
            return new Promise((resolve) =>
                general.setTimeout_safe(() => resolve(axios(config)), delay)
            );
        }

        return Promise.reject(error);
    });
};

export default {
    isRetryableError,
    isNetworkError,
    isSafeRequestError,
    isIdempotentRequestError,
    isNetworkOrIdempotentRequestError,
    axiosRetry,
    gotRateLimited,
};

// module.exports = {
//     isRetryableError,
//     isNetworkError,
//     isSafeRequestError,
//     isIdempotentRequestError,
//     isNetworkOrIdempotentRequestError,
//     axiosRetry,
//     gotRateLimited,
//};
/*
  // Compatibility with CommonJS
  axiosRetry.isNetworkError = isNetworkError;
  axiosRetry.isSafeRequestError = isSafeRequestError;
  axiosRetry.isIdempotentRequestError = isIdempotentRequestError;
  axiosRetry.isNetworkOrIdempotentRequestError = isNetworkOrIdempotentRequestError;
  axiosRetry.exponentialDelay = exponentialDelay;
  axiosRetry.isRetryableError = isRetryableError;*/
