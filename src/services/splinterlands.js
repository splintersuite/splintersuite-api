const logger = require('../util/pinologger');
const axiosInstance = require('../util/axiosInstance');
const path = require('path');
const jsonfile = require('jsonfile');

const getCardDetail = async () => {
    logger.debug(`/services/splinterlands/getCardDetail`);
    const cards = await axiosInstance.get(
        'https://api2.splinterlands.com/cards/get_details'
    );
    return cards.data;
};

const getMarketInfoForCard = async ({ card_detail_id }) => {
    try {
        const url = `https://api2.splinterlands.com/market/active_rentals`;
        const res = await axiosInstance.get(url, {
            params: {
                card_detail_id,
            },
        });
        if (!Array.isArray(res.data)) {
            throw new Error(`https://api2.splinterlands.com/market/active_rentals?card_detail_id=${card_detail_id} not returning an array, returned : ${JSON.stringify(
                res.data
            )}
            `);
        }

        return res.data;
    } catch (err) {
        logger.error(
            `/src/services/splinterlands/getMarketInfoForCard error: ${err.message}`
        );
        throw err;
    }
};

const updateCardDetail = async () => {
    try {
        logger.debug(`/services/splinterlands/updateCardDetail`);

        const filePath = path.join(__dirname, '..', 'util', 'cardDetails.json');
        const details = await getCardDetail();
        jsonfile.writeFileSync(filePath, details);

        logger.info(`/services/splinterlands/updateCardDetail`);
        return;
    } catch (err) {
        logger.error(
            `/services/splinterlands/updateCardDetail error: ${err.message}`
        );
        throw err;
    }
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
    try {
        logger.debug(`/services/splinterlands/getActiveRentals`);

        const activeRentals = await axiosInstance.get(
            `https://api2.splinterlands.com/market/active_rentals?owner=${username}`
        );

        if (!Array.isArray(activeRentals.data)) {
            logger.error(
                `/services/splinterlands/getActiveRentals active_rentals response.data is not an array`
            );
            throw new Error(
                `https://api2.splinterlands.com/market/active_rentals?owner=${username} not returning an array`
            );
        }

        logger.info(
            `/services/splinterlands/getActiveRentals User: ${username} Rentals: ${activeRentals?.data?.length}`
        );
        return activeRentals.data;
    } catch (err) {
        logger.error(
            `/services/splinterlands/getActiveRentals error: ${err.messagee}`
        );
        throw err;
    }
};

const getActiveRentalsRange = async ({ username, offset }) => {
    try {
        logger.debug(`getActiveRentalsRange with offset: ${offset}`);

        const limit = 200;

        const url = `https://api2.splinterlands.com/market/rental_history`;
        const activeRentals = await axiosInstance.get(url, {
            params: {
                player: username,
                offset,
                limit,
            },
        });

        if (!Array.isArray(activeRentals.data)) {
            logger.error(
                `/services/splinterlands/getActiveRentalsRange rental_history response.data is not an array`
            );
            throw new Error(
                `https://api2.splinterlands.com/market/rental_history, username: ${username}, offset: ${offset} not returning an array`
            );
        }
        logger.info(
            `/services/splinterlands/getActiveRentalsRange User: ${username} Rentals: ${activeRentals?.data?.length}`
        );

        return activeRentals.data;
    } catch (err) {
        logger.error(
            `/services/splinterlands/getActiveRentalsRange error: ${err.message}`
        );
        throw err;
    }
};

const getSettings = async () => {
    try {
        logger.debug(`/services/splinterlands/getSettings`);

        const url = 'https://api2.splinterlands.com/settings';

        const res = await axiosInstance(url);

        const data = res.data;
        logger.info(`/services/splinterlands/getSettings`);
        return data;
    } catch (err) {
        logger.error(
            `/services/splinterlands/getSettings error: ${err.message}`
        );
        throw err;
    }
};

const getHiveRelistings = async ({ username }) => {
    try {
        logger.debug(`/services/splinterlands/getHiveRelistings start`);
        const url = `https://api2.splinterlands.com/players/history?username=${username}&from_block=-1&limit=500&types=update_rental_price`;
        const res = await axiosInstance(url);

        const results = res.data;
        logger.debug(`/services/splinterlands/getHiveRelistings done`);
        return results;
    } catch (err) {
        logger.error(
            `/services/splinterlands/getHiveRelistings error: ${err.message}`
        );
        throw err;
    }
};

module.exports = {
    getCollection,
    getCollectionListings,
    getActiveRentals,
    getSettings,
    updateCardDetail,
    getActiveRentalsRange,
    getMarketInfoForCard,
    getHiveRelistings,
};
