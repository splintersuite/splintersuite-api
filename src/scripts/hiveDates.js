'use strict';
const logger = require('../util/pinologger');
const relistingsService = require('../services/hive/relistings');
const utilDates = require(`../util/dates`);
const hiveDates = require('../services/hive/dates');

const postCreatedDates = async () => {
    try {
        const start = new Date();
        const startTime = start.getTime();
        logger.info(
            `/scripts/services/hiveDates/postCreatedDates start: ${start}, startTime: ${startTime}`
        );

        await hiveDates.updateHiveTxDates();

        const end = new Date();
        const endTime = end.getTime();
        const totalMinsLong = utilDates.computeMinsSinceStart({
            startTime,
            endTime,
        });

        logger.info(
            `/scripts/services/hiveDates/postCreatedDates: end: ${end}, endTime: ${endTime}, totalMinsLong: ${totalMinsLong}`
        );
        process.exit(0);
    } catch (err) {
        logger.error(
            `/scripts/services/hiveDates/postCreatedDates error: ${err.message}`
        );
        throw err;
    }
};

postCreatedDates();
