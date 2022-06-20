const axiosInstance = require('../util/axiosInstance');

const getCardDetail = async () => {
    const cards = await axiosInstance.get(
        'https://api2.splinterlands.com/cards/get_details'
    );
    return cards.data;
};

module.exports = { getCardDetail };
