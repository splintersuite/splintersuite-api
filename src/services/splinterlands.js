const logger = require('../util/pinologger');
const axiosInstance = require('../util/axiosInstance');

const getCardDetail = async () => {
    logger.debug(`/services/splinterlands/getCardDetail`);
    const cards = await axiosInstance.get(
        'https://api2.splinterlands.com/cards/get_details'
    );
    return cards.data;
};

// could add cache functionality here to limit api calls
const getCollection = async ({ username }) => {
    logger.debug(`/services/splinterlands/getCollection`);
    const collection = await axiosInstance.get(
        `https://api2.splinterlands.com/cards/collection/${username}`
    );

    if (
        !collection.data ||
        !collection.data.cards ||
        !Array.isArray(collection.data.cards)
    ) {
        throw new Error(
            `https://api2.splinterlands.com/cards/collection/${username} returning something crazy`
        );
    }

    // filters out delegated or rentals cards
    return collection.data.cards.filter(({ player }) => player === username);
};

const getCollectionListings = async ({ username }) => {
    logger.debug(`/services/splinterlands/getCollectionListings`);
    const collection = await getCollection({ username });

    // listed but not rented market_listing_status = 0
    // rented, market_listing_status = 3
    // market_id in collection = sell_trx_id in our db
    // delegation_tx in collection = rental_tx in our db

    return {
        rented: collection
            .filter(({ market_listing_status }) => market_listing_status === 3)
            .map((listing) => ({
                ...listing,
                sell_trx_id: listing.market_id,
                rental_tx: listing.delegation_tx,
            })),
        notRented: collection
            .filter(({ market_listing_status }) => market_listing_status === 0)
            .map((listing) => ({
                ...listing,
                sell_trx_id: listing.market_id,
                rental_tx: listing.delegation_tx,
            })),
    };
};

const getActiveRentals = async ({ username }) => {
    logger.debug(`/services/splinterlands/getActiveRentals`);
    const activeRentals = await axiosInstance.get(
        `https://api2.splinterlands.com/market/active_rentals?owner=${username}`
    );

    if (!Array.isArray(activeRentals.data)) {
        throw new Error(
            `https://api2.splinterlands.com/market/active_rentals?owner=${username} returning something crazy`
        );
    }

    return activeRentals.data;
};

const getSettings = async () => {
    try {
        logger.debug(`/services/splinterlands/getSettings`);

        const url = 'https://api2.splinterlands.com/settings';

        const res = await axiosInstance(url);

        const data = res.data;

        return data;
    } catch (err) {
        logger.error(`getSplinterlandsSettings error: ${err.message}`);
        throw err;
    }
};

module.exports = {
    getCardDetail,
    getCollection,
    getCollectionListings,
    getActiveRentals,
    getSettings,
};
