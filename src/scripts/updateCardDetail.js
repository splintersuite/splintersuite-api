'use strict';
const logger = require('../util/pinologger');
const splinterlandsService = require('../services/splinterlands');

const updateCardDetails = async () => {
    try {
        logger.info(`/scripts/updateCardDetail/updateCardDetails`);
        await splinterlandsService.updateCardDetail();
        logger.info(`/scripts/updateCardDetail/updateCardDetails:`);
        return;
    } catch (err) {
        logger.error(
            `/scripts/updateCardDetail/updateCardDetails error: ${err.message}`
        );
        throw err;
    }
};

updateCardDetails();
