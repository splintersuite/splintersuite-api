const dotenv = require('dotenv');
const knex = require('knex');
const knexfile = require('../knexfile.js');
const logger = require('../src/util/pinologger');
const now = require('performance-now');
dotenv.config();
const config = knexfile[process.env.NODE_ENV];
// https://spin.atomicobject.com/2017/03/27/timing-queries-knexjs-nodejs/
const times = {};
let count = 0;

const printQueryWithTime = (uid) => {
    const { startTime, endTime, query } = times[uid];
    const elapsedTime = endTime - startTime;

    logger.info(`query.sql: ${query.sql}`);
    logger.info(`Time: ${elapsedTime.toFixed(3)} ms`);
    // After we print the query, we have no more use for it so we delete it so this object doesn't grow too big
    delete times[uid];
};

const printIfPossible = (uid) => {
    const { position } = times[uid];

    // look for a query with a positon one less than the current query
    const previousTimeUid = Object.keys(times).find(
        (key) => times[key].position === position - 1
    );

    // if we didn't find it, it must have been printed already and we can safely print ourselves
    if (!previousTimeUid) {
        printQueryWithTime(uid);
    }
};

const printQueriesAfterGivenPosition = (position) => {
    // look for the next query in the queue
    const nextTimeUid = Object.keys(times).find(
        (key) => times[key].position === position + 1
    );

    // If we find one and it says its finished, we can go ahead and print it
    if (nextTimeUid && times[nextTimeUid].finished) {
        const nextPosition = times[nextTimeUid].position;
        printQueryWithTime(nextTimeUid[uid]);
        // There might be more queries that need to printed, so we should keep looking...
        printQueriesAfterGivenPosition(nextPosition);
    }
};

const knexObj = knex(config);
knexObj
    .on('query', (query) => {
        const uid = query.__knexQueryUid;
        times[uid] = {
            position: count,
            query,
            startTime: now(),
            finished: false,
        };
        count = count + 1;
    })
    .on('query-response', (response, query) => {
        const uid = query.__knexQueryUid;
        times[uid].endTime = now();
        times[uid].finished = true;
        const position = times[uid].position;

        // print the current query, if i'm able
        printIfPossible(uid);

        // check to see if queries further down the queue can be executed,
        // in case they weren't able to be printed when they first responded
        printQueriesAfterGivenPosition(position);
    });

module.exports = knexObj;
