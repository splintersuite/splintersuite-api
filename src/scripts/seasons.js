'use strict';
const logger = require('../util/pinologger');
const seasonService = require('../services/seasons');
const invoiceService = require('../services/invoices');
const splinterlandsService = require('../services/splinterlands');

const extractSLSeasonData = (settings) => {
    try {
        logger.debug(`/scripts/seasons/extractSLSeasonData`);

        const { season } = settings;
        const { id, name, ends } = season;

        logger.info(
            `/scripts/seasons/extractSLSeasonData ID: ${id}, Name: ${name}, ends: ${ends}`
        );
        return { id, name, ends };
    } catch (err) {
        logger.error(`extractSLSeasonData error: ${err.message}`);
        throw err;
    }
};

const getSLSeasonData = async () => {
    try {
        logger.info(`/scripts/seasons/getSLSeasonData`);

        const data = await splinterlandsService.getSettings();
        const seasonData = extractSLSeasonData(data);
        await seasonService.create({
            seasonData,
        });

        logger.info('/scripts/seasons/getSLSeasonData:');
        process.exit(0);
    } catch (err) {
        logger.error(`/scripts/seasons/getSLSeasonData error: ${err.message}`);
        throw err;
    }
};

const createInvoices = async () => {
    try {
        logger.debug(`/scripts/seasons/createInvoices`);

        await invoiceService.create();
        const userIdsToLock = await invoiceService.lockUsers();
        await invoiceService.unlockUsers({ userIdsToLock });

        logger.info(`/scripts/seasons/createInvoices`);
        return;
    } catch (err) {
        logger.error(`/scripts/seasons/createInvoices error: ${err.message}`);
        throw err;
    }
};

getSLSeasonData();
