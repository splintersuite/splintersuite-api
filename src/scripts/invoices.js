'use strict';
const logger = require('../util/pinologger');
const Users = require('../models/Users');
const Invoices = require('../models/Invoices');
const retryFncs = require('../util/axios_retry/general');
const invoiceService = require('../services/tntinvoices');
const datesUtil = require('../util/dates');

// we want to first make it so each user has a free 15 day trial, that starts 15 days after they make their account.  We then want to have invoices happen every 15 day period afterward that covers the previous 15 days, and then gives 5 days to pay your invoice.
const generateInvoices = async () => {
    try {
        logger.debug(`/scripts/invoices/generateInvoices start`);

        const now = new Date();
        const fifteenAgo = datesUtil.getNumDaysAgo({
            numberOfDaysAgo: 15,
            date: now,
        });

        // first 15 days are free, so we don't need to generate invoices for these peeps during that time period
        const users = await Users.query().where(
            'created_at',
            '<',
            fifteenAgo.daysAgo
        ); // TNT NOTE; we should just get all of those that have a created_date at 15 days ago or more.
        logger.info(
            `users: ${JSON.stringify(users)}      length: ${users?.length}`
        );
        // TNT NOTE; we are getting back the users that we need to work with.
        for (const user of users) {
            // interval is one invoicing cycle
            let start_interval_date;
            let end_interval_date;
            const startSuiteFees = datesUtil.getNumDaysLater({
                numberOfDaysFromNow: 15,
                date: users?.created_at,
            });
            start_interval_date = startSuiteFees?.daysFromLater;

            const endOfInterval = datesUtil.getNumDaysLater({
                numberOfDaysFromNow: 15,
                date: start_interval_date,
            });
            end_interval_date = endOfInterval?.daysFromLater;
            // TNT NOTE: we should try and calc all the intervals, and then do a for loop through that amount
            // for example, we can divide the days since the last invoices generated (or 15 days post created_at)
            // and then loop through that number so we can insert all the invoices we need
            // we could make the botRentals just be 50% of the start of that day's bot earnings, so it would balance out across all users

            // if we are currently past the time that the interval date has ended, we can create some invoices
            if (now.getTime() > end_interval_date.getTime()) {
                logger.info(
                    `now.getTime(): ${now.getTime()}, start_interval_date.getTime(): ${start_interval_date.getTime()}`
                );
                throw new Error('checking the times to see whats up');
            }

            const recentInvoices = await Invoices.query()
                .where({ users_id: users.id })
                .orderBy('end_date', 'desc');
            // so the most recent one will be the most recent one

            logger.info(`recentInvoices: ${JSON.stringify(recentInvoices)}`);
            let start_date;
            let end_date;
            if (Array.isArray(recentInvoices) && recentInvoices?.length < 1) {
                // this means we don't have any elements in the array, therefore there are no recent invoices.
                start_date = users?.created_at;
            }
        }

        // So if we are gonna make sure that we are invoicing for after the first 15 days, will need to kindve just check daily and see if it’s been 15 days since the last billing cycle completely, and if it has then charge em the earnings between last invoice date end date and the 15 days after that (or do we want to always have it come to the present time period when invoices are being made?  I think we should make sure that we

        // steps we need to do
        // 1) we need to then see if any invoices have been made of each 15 day period after the first 15 days, and imo we should include invoices of 0 in this
    } catch (err) {
        logger.error(
            `/scripts/invoices/generateInvoices error: ${err.message}`
        );
        throw err;
    }
};

generateInvoices();
