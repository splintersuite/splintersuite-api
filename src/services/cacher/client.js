'use strict';
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect(); // this is async, new as of redis 4
//github.com/redis/node-redis/blob/master/docs/v3-to-v4.md

https: module.exports = {
    client,
};
