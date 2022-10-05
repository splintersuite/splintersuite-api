'use strict';
const logger = require('../util/pinologger');
const CollectionListings = require('../models/CollectionListings');
const userService = require('./users');
const _ = require('lodash');

const get = async ({ users_id }) => {
    logger.debug(`/services/listings/get`);

    const listings = CollectionListings.query().where({ users_id });

    if (!Array.isArray(listings)) {
        return null;
    }

    return listings;
};

const updateCollectionListings = async ({
    newRentalListings,
    updateRentalDetails,
    username,
}) => {
    logger.debug('/services/listings/updateCollectionListings');
    const user = await userService.get({ username });
};

const updateListings = async ({ updatedListings, users_id }) => {
    logger.debug(`/services/listings/updateListings`);
    let chunks;

    if (updatedListings?.length > 1000) {
        chunks = _.chunk(updateListings, 1000);
    }
    if (chunks?.length === updatedListings?.length) {
        chunks = [chunks];
    }

    for (const listingChunk of chunks) {
        await CollectionListings;
    }
};

module.exports = {
    get,
    updateAllListings,
};
