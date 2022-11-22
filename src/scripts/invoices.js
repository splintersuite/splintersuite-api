'use strict';
const logger = require('../util/pinologger');
const Users = require('../models/Users');
const Invoices = require('../models/Invoices');
const { DateTime, Interval } = require('luxon');
const retryFncs = require('../util/axios_retry/general');
const invoiceService = require('../services/tntinvoices');
const datesUtil = require('../util/dates');
const _ = require('lodash');

// we want to first make it so each user has a free 15 day trial, that starts 15 days after they make their account.  We then want to have invoices happen every 15 day period afterward that covers the previous 15 days, and then gives 5 days to pay your invoice.
const generateInvoices = async () => {
    try {
        logger.debug(`/scripts/invoices/generateInvoices start`);

        const now = DateTime.utc();
        const startOfToday = datesUtil.getStartOfDay({ date: now });
        const yesterday = startOfToday.minus({ days: 1 });
        // WE SHOULD CHANGE THIS TO 14 DAYS?
        const fifteenDaysAgo = now.minus({ days: 15 });

        // first 15 days are free, so we don't need to generate invoices for these peeps during that time period
        const users = await Users.query().where(
            'created_at',
            '<',
            fifteenDaysAgo
        );

        for (const user of users) {
            // interval is one invoicing cycle
            let start_interval_date;
            let end_interval_date;
            let first_invoice = true;

            const userCreatedAtDT = DateTime.fromJSDate(user?.created_at);
            const startOfCreatedAtDay = datesUtil.getStartOfDay({
                date: userCreatedAtDT,
            });
            // this will only be useful if we end up needing to calculate the first day of earnings for a first invoice
            const IntCreatedTimes = Interval.fromDateTimes(
                startOfCreatedAtDay,
                userCreatedAtDT
            );
            const diffDays = IntCreatedTimes.length('days');

            const startSuiteFees = startOfCreatedAtDay.plus({ days: 15 });
            start_interval_date = startSuiteFees;
            end_interval_date = start_interval_date.plus({ days: 15 });
            logger.info(
                `start_interval_date: ${start_interval_date}, start_interval_date.plus({days:15}): ${start_interval_date.plus(
                    { days: 15 }
                )}, end_interval_date: ${end_interval_date}`
            );
            const totalInterval = Interval.fromDateTimes(
                startSuiteFees,
                yesterday
            );
            const intervalDays = totalInterval.length('days');
            logger.info(
                `totalInterval: ${JSON.stringify(
                    totalInterval
                )}, intervalDays: ${intervalDays}, diffDays: ${diffDays}, IntCreatedTimes: ${JSON.stringify(
                    IntCreatedTimes
                )}`
            );
            const totalCycles = intervalDays / 15;
            const totalInvoiceCycles = Math.floor(intervalDays / 15);
            logger.info(
                `totalCycles: ${totalCycles}, totalInvoiceCycles: ${totalInvoiceCycles} startSuiteFees: ${startSuiteFees}, startSuiteFees.toJSDate: ${startSuiteFees.toJSDate()}`
            );

            const recentInvoices = await Invoices.query()
                .where({ users_id: user.id })
                .orderBy('end_date', 'desc');

            const invoicesDates = getSearchableInvoices({
                invoices: recentInvoices,
            });
            let count = 0;
            while (count < totalInvoiceCycles) {
                const start_date = start_interval_date;
                const end_date = end_interval_date;
                logger.info(
                    `count: ${count}, start_date: ${start_date}, end_date: ${end_date}`
                );
                const { year, month, day } = start_date;
                const key = `${year},${month},${day}`;
                const dbEntry = invoicesDates[key];

                if (!dbEntry) {
                    await invoiceService.create({
                        users_id: user.id,
                        start_date,
                        end_date,
                    });
                }

                // if (count > 2) {
                //     throw new Error(
                //         'checking the start_date and end_date for the earnings'
                //     );
                // }
                // we need to query to make sure that we don't already have an invoice input
                if (first_invoice) {
                    first_invoice = false;
                }
                count = count + 1;
                start_interval_date = end_date;
                end_interval_date = start_interval_date.plus({ days: 15 });
            }
            logger.info(`new invoices done for user: ${user.username}`);
            throw new Error('xdww');
            //     const intervalDays =
            const orgStartSuiteFees = datesUtil.getNumDaysLater({
                numberOfDaysLater: 15,
                date: user?.created_at,
            });

            logger.info(
                `user: ${JSON.stringify(user)}, users?.created_at: ${
                    user?.created_at
                }, userCreatedAtDT: ${userCreatedAtDT}, startOfCreatedAtDay: ${startOfCreatedAtDay}, startSuiteFees: ${startSuiteFees}, orgStartSuiteFees: ${JSON.stringify(
                    orgStartSuiteFees
                )}}`
            );

            throw new Error('checking');
            start_interval_date = startSuiteFees?.daysFromLater; // we should actually have this be the start of the day

            const endOfInterval = datesUtil.getNumDaysLater({
                numberOfDaysFromNow: 15,
                date: start_interval_date,
            });
            end_interval_date = endOfInterval?.daysFromLater;
            //   const startOfDay = datesUtil.getStartOfDay({})
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

            // so the most recent one will be the most recent one

            logger.info(`recentInvoices: ${JSON.stringify(recentInvoices)}`);
            let start_date;
            let end_date;
            if (Array.isArray(recentInvoices) && recentInvoices?.length < 1) {
                // this means we don't have any elements in the array, therefore there are no recent invoices.
                start_date = user?.created_at;
            } else {
                start_date = recentInvoices[0]?.end_date;
            }
            const endDate = datesUtil.getNumDaysLater({
                numberOfDaysFromNow: 15,
                date: start_date,
            });
            end_date = endDate?.daysFromLater;
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

const getSearchableInvoices = ({ invoices }) => {
    try {
        logger.debug(`/scripts/invoices/getSearchableInvoices`);

        const invoiceStartDates = invoices.map((invoice) => {
            const date = DateTime.fromJSDate(invoice?.start_date);
            return date.toUTC();
        });
        logger.debug(
            `/scripts/invoices/getSearchableInvoices invoiceStartDates: ${JSON.stringify(
                invoiceStartDates
            )}`
        );

        const uniqueDates = _.uniq(invoiceStartDates);
        const uniqueObj = getInvoiceDateObj({ invoiceDates: uniqueDates });
        logger.info(`/scripts/invoices/getSearchableInvoices:`);
        logger.info(
            `invoiceStartDates: ${invoiceStartDates?.length}, uniqueDates: ${
                uniqueDates?.length
            }, uniqueObj: ${Object.keys(uniqueObj)?.length}`
        );
        return uniqueObj;
    } catch (err) {
        logger.error(
            `/scripts/invoices/getSearchableInvoices error: ${err.message}`
        );
        throw err;
    }
};

const getInvoiceDateObj = ({ invoiceDates }) => {
    try {
        logger.debug(`getInvoiceDateObj start`);

        const obj = {};
        if (invoiceDates?.length < 1) {
            return obj;
        }
        for (const invoiceDate of invoiceDates) {
            const { year, month, day } = invoiceDate;
            const key = `${year},${month},${day}`;
            obj[key] = invoiceDate;
        }

        logger.debug(`/scripts/invoices/getInvoiceDateObj: `);
        return obj;
    } catch (err) {
        logger.error(`getInvoiceDateObj error: ${err.message}`);
        throw err;
    }
};

// we should have this be the startOfTheDay here
const calculateNumerOfCycles = ({ startOfBillingEligble }) => {
    try {
        logger.debug(`/scripts/invoices/calculateNumberOfCycles`);
    } catch (err) {
        logger.error(
            `/scripts/invoices/calculateNumberOfCycles error: ${err.message}`
        );
        throw err;
    }
};

generateInvoices();
