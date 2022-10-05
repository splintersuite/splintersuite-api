'use strict';
const logger = require('../util/pinologger');
const splinterlandsService = require('../services/splinterlands');

const updateCardDetails = async () => {
    try {
        await splinterlandsService.updateCardDetail();
        logger.info(`updateCardDetails done`);
        return;
    } catch (err) {
        logger.error(
            `/scripts/updateCardDetail/updateCardDetails error: ${err.message}`
        );
        throw err;
    }
};

updateCardDetails();
