'use strict';
const logger = require('../util/pinologger');
const relistingsService = require('../services/hive/relistings');
const utilDates = require(`../util/dates`);

const postCreatedDates = async () => {
    try {
        const start = new Date();
        const startTime = start.getTime();
        logger.info(
            `/scripts/services/hiveDates/postCreatedDates start: ${start}, startTime: ${startTime}`
        );
    } catch (err) {
        logger.error(
            `/scripts/services/hiveDates/postCreatedDates error: ${err.message}`
        );
        throw err;
    }
};

postCreatedDates();
