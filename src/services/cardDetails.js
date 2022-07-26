'use strict';
const logger = require('../util/pinologger');
let cardDetails = require('../util/cardDetails.json');
// let cardDetailObj = create();
const get = ({ card_detail_id }) => {
    try {
        // if cardDetailObj[card_detail_id] == null
        // update the .json file, then
        // cardDetailObj = create();
    } catch (err) {
        logger.error(``);
    }
};

const create = () => {
    try {
        // create the cardDetailsObj here
    } catch (err) {
        logger.error(`create error: ${err.message}`);
        throw err;
    }
};
