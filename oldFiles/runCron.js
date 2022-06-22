const cron = require('node-cron');
const {
    updateRentalsForUsers,
    rentalWhenToRunMorning,
    rentalWhenToRunEvening,
    rentalOptions,
} = require('./rentals');
const {
    getHistoricalData,
    historicalFetchMorning,
    historicalFetchEvening,
    historicalFetchOptions,
} = require('./historicalData');

// runs at 11:00 and grabs listings/rentals
const morningUpdateRentals = cron.schedule(
    rentalWhenToRunMorning,
    updateRentalsForUsers,
    rentalOptions
);
morningUpdateRentals.start();

// runs at 23:00 and grabs listings/rentals and Calcs earnings
const eveningUpdateRentalsAndCalcEarnings = cron.schedule(
    rentalWhenToRunEvening,
    updateRentalsForUsers,
    rentalOptions
);
eveningUpdateRentalsAndCalcEarnings.start();

// runs at 05:00 and grabs historical data of each card
const morningFetchMarketData = cron.schedule(
    historicalFetchMorning,
    getHistoricalData,
    historicalFetchOptions
);
morningFetchMarketData.start();

// runs at 17:00 and grabs historical data of each card
const eveningFetchMarketData = cron.schedule(
    historicalFetchEvening,
    getHistoricalData,
    historicalFetchOptions
);
eveningFetchMarketData.start();
