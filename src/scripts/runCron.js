import cron from 'node-cron';
import {
    updateRentalsForUsers,
    rentalWhenToRunMorning,
    rentalWhenToRunEvening,
    rentalOptions,
} from './rentals';
import {
    getHistoricalData,
    historicalFetchMorning,
    historicalFetchEvening,
    historicalFetchOptions,
} from './historicalData';

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
