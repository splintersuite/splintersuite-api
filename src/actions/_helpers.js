const cardDetails = require('../util/cardDetails.json');
const findCardDetails = (id) => {
    try {
        //  console.log(`findCardDetails start`);
        const card = cardDetails.find((o) => parseInt(o.id) === parseInt(id));
        const { name, rarity, editions, is_promo, tier } = card;

        return { name, rarity, editions, is_promo, tier };
    } catch (err) {
        console.error(`findCardDetails error: ${err.message}`);
        throw err;
    }
};

module.exports = { findCardDetails };
