"use strict";
const _ = require('lodash');
const exchangeLimits = require('./exchangeLimits');
const logger = require('../../utils/pinologger');

const { client } = require('../../services/cachers/client');

// exchange: { weight: 500 }
const updateWeights = async ({ exchange, newRequestWeight, newRequestTime }, req_logID) => {
  try {
    if (exchange == null || newRequestWeight == null || newRequestTime == null || req_logID == null) {
      logger.error({ requestId: req_logID }, 'in updateWeights, either exchange, newRequestWeight, newRequestTime, or req_logID parameter is missing');
      throw new ReferenceError('exchange, newRequestWeight, newRequestTime, or req_logID parameters required');
    }
    let requestHistory = await client.get(exchange);
    /* .catch(err => {
       logger.error({ requestId: req_logID }, 'client.get(exchange) error: ', err.message);
       err.name = 'RedisError';
       throw err;
     });*/
    if (requestHistory) {
      requestHistory = JSON.parse(requestHistory);
      requestHistory.push({
        weight: newRequestWeight,
        createdAt: newRequestTime
      });
      await client.set(exchange, JSON.stringify(requestHistory));
      /* .catch(err => {
         logger.error({ requestId: req_logID }, 'client.set(exchange) error: ', err.message);
         err.name = 'RedisError';
         throw err;
       });*/
    } else {
      await client.set(
        exchange, JSON.stringify([{ weight: newRequestWeight, createdAt: newRequestTime }])
      );
      /* .catch(err => {
         logger.error({ requestId: req_logID }, 'client.set(exchange) error: ', err.message);
         err.name = 'RedisError';
         throw err;
       });*/
    }
    // expire this exchange's current weight in seconds
    await client.expire(exchange, exchangeLimits[exchange].period / 1000);
    /* .catch(err => {
       logger.error({ requestId: req_logID }, 'client.set(exchange) error: ', err.message);
       err.name = 'RedisError';
       throw err;
     });*/
    return;
  } catch (err) {
    logger.error({ requestId: req_logID }, 'updateWeights error: ', err.message);
    throw err;
  }
}

const canSendRequest = async ({ exchange, newRequestWeight }, req_logID) => {
  try {
    if (exchange == null || newRequestWeight == null || req_logID == null) {
      logger.debug({ requestId: req_logID }, { exchange, newRequestWeight, req_logID })
      logger.error(`in canSendRequest, either exchange, newRequestWeight, or req_logID parameters missing`);
      throw new ReferenceError('exchange and newRequestWeight parameters required');
    }
    logger.debug({ requestId: req_logID }, 'canSendRequest start');
    let requestHistory = await client.get(exchange);
    /*.catch(err => {
      logger.error({ requestId: req_logID }, 'client.get(exchange) error: ', err.message);
      err.name = 'RedisError';
      throw err;
    });*/

    let activeWeight;
    if (requestHistory) {
      requestHistory = JSON.parse(requestHistory);
      const now = (new Date()).getTime();
      const exchangeStartPeriod = now - (exchangeLimits[exchange].period + 1000);
      // TNT QUESTION: is there ever an instance where now would be less than createdAt?
      let recentRequests = requestHistory.filter(
        ({ createdAt }) => (now > createdAt && createdAt > exchangeStartPeriod)
      );
      logger.debug({ requestId: req_logID }, 'requestHistory length: ', requestHistory.length);
      // set the cache to the current requests, save some memory
      await client.set(exchange, JSON.stringify(recentRequests));
      /* .catch(err => {
         logger.error({ requestId: req_logID }, 'client.set(exchange) error: ', err.message);
         err.name = 'RedisError';
         throw err;
       });*/
      await client.expire(exchange, Math.ceil(exchangeLimits[exchange].period / 1000)); // setting nullifies previous expire
      /* .catch(err => {
         logger.error({ requestId: req_logID }, 'client.expire(exchange) error: ', err.message);
         err.name = 'RedisError';
         throw err;
       });*/

      logger.debug({ requestId: req_logID }, 'recentRequests length: ', recentRequests.length);
      // logger.debug({ requestId: req_logID }, 'recentRequests: ', recentRequests);

      activeWeight = _.sumBy(recentRequests, 'weight');
      logger.debug({ requestId: req_logID }, 'activeWeight: ', activeWeight);
      const maxWeight = exchangeLimits[exchange].maxWeight;
      logger.debug({ requestId: req_logID }, maxWeight);

      if (activeWeight + newRequestWeight > maxWeight) {
        // see when the next transaction drops off to determine how long to sleep for
        recentRequests = _.sortBy(recentRequests, 'createdAt'); // sorts ascending
        let timeTillDropOff = null;
        let weightDroppedOff = 0;
        recentRequests.some(req => {
          if (
            // if we're under the limit after this request drops off
            maxWeight > activeWeight + newRequestWeight - weightDroppedOff
            - req.weight
          ) {
            logger.debug({ requestId: req_logID }, 'sleeping for: ');
            logger.debug({ requestId: req_logID }, 'req.createdAt: ', req.createdAt);
            logger.debug({ requestId: req_logID }, 'exchangeStartPeriod: ', exchangeStartPeriod);
            logger.debug({ requestId: req_logID }, req.createdAt - exchangeStartPeriod);
            timeTillDropOff = req.createdAt - exchangeStartPeriod;
            return true;
          }
          weightDroppedOff += req.weight
          return false;
        });
        if (timeTillDropOff != null) {
          logger.debug({ requestId: req_logID }, `canSendRequest returning with cant send request, and wait for ${timeTillDropOff + 1000} milliseconds`);
          return {
            canSendRequest: false,
            waitTimeMs: timeTillDropOff + 1000 // add an extra second
          };
        }
        logger.debug({ requestId: req_logID }, `canSendRequest returning with cant send request, and wait for ${exchangeLimits[exchange] + 1000} milliseconds`);
        return {
          canSendRequest: false,
          waitTimeMs: exchangeLimits[exchange]
        };
      }
    }
    logger.debug({ requestId: req_logID }, `canSendRequest returning with can send request`);
    return { canSendRequest: true };
  } catch (err) {
    logger.error({ requestId: req_logID }, 'canSendRequest error: ', err.message);
    throw err;
  }
}

module.exports = {
  updateWeights,
  canSendRequest
};
