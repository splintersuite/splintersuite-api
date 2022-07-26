'use strict';

const splinterlandsService = require('./src/services/splinterlands');
const logger = require('./src/util/pinologger');

const start = async () => {
    try {
        logger.debug(`test/start`);

        await splinterlandsService.updateCardDetail();
    } catch (err) {
        logger.error(`test/start error: ${err.message}`);
    }
};

start();
