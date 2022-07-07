const _ = require('lodash');

const logger = require('../util/pinologger');
const Invoices = require('../models/Invoices');
const Seasons = require('../models/Seasons');
const Users = require('../models/Users');
const DailyEarnings = require('../models/DailyEarnings');

const get = async ({ users_id }) => {
    logger.debug('/services/invoices/get');
    const invoices = await Invoices.query().where({ users_id });

    if (!Array.isArray(invoices)) {
        throw new Error('database errored on querying invoices');
    }

    return invoices;
};

const getLast = async ({ users_id }) => {
    logger.debug('/services/invoices/getLast');
    const invoice = await Invoices.query()
        .join('season', { 'invoices.season_id': 'seasons.id' })
        .select('invoices.*', 'seasons.season_name')
        .where({ users_id });

    return invoice;
};

// ---
// Create invoices for the previous season
// ------------------------------------
const create = async () => {
    try {
        logger.debug('/services/invoices/create');
        const seasons = await Seasons.query().orderBy('end_date', 'desc');

        // seasons[0] will be the NEWEST season
        // seasons[1] is the last season and the one i want to bill!
        // seasons[2].end_date is the beginning of season[1]

        let seasonStartDate;
        let seasonEndDate;
        if (seasons.length === 1) {
            // wait till next season to start billing
            return;
        }
        if (seasons.length > 2) {
            seasonEndDate = seasons[1].end_date;
            seasonStartDate = seasons[2].end_date;
        } else if (seasons.length === 2) {
            // assume the beginning of the first season started 14 days before the end
            seasonEndDate = seasons[1].end_date;
            seasonStartDate = new Date(
                seasons[1].end_date.getTime() - 1000 * 60 * 60 * 24 * 14
            );
        }

        const users = await Users.query();

        const userIds = users.map(({ id }) => id);
        let chunks = userIds;

        if (userIds.length > 998) {
            chunks = _.chunk(userIds, 998);
        }

        if (chunks.length === userIds.length) {
            chunks = [chunks];
        }

        let earnings = [];
        for (const idChunk of chunks) {
            const thisChunksEarnings = await DailyEarnings.query()
                .whereIn('users_id', idChunk)
                .whereBetween('earnings_date', [
                    seasonStartDate,
                    new Date(seasonEndDate.getTime() + 10000),
                ]);
            earnings = _.concat(earnings, thisChunksEarnings);
        }

        const earningsObj = {};
        earnings.forEach((record) => {
            if (!(record.users_id in earningsObj)) {
                earningsObj[record.users_id] = [];
            }
            earningsObj[record.users_id].push(record);
        });

        const twoWeeksFromNow = new Date(
            new Date().getTime() + 1000 * 60 * 60 * 24 * 14
        );
        const threeDaysFromNow = new Date(
            new Date().getTime() + 1000 * 60 * 60 * 24 * 3
        );
        const invoices = [];
        for (const users_id of Object.keys(earningsObj)) {
            const amountDue = _.round(
                _.sum(
                    earningsObj[users_id].map(
                        ({ bot_earnings_dec }) => bot_earnings_dec
                    )
                ) * 0.1,
                2
            );
            if (amountDue > 0.01) {
                invoices.push({
                    users_id,
                    season_id: seasons[1].id,
                    discounted_due_at: threeDaysFromNow,
                    due_at: twoWeeksFromNow,
                    amount_due: amountDue,
                    season_name: seasons[1].name,
                });
            }
        }

        if (invoices.length > 0) {
            await Invoices.query().insert(invoices);
        }
    } catch (err) {
        logger.error(`/services/invoices/create error: ${err.message}`);
        throw err;
    }
};

const lockUsers = async () => {
    logger.debug('/services/invoices/lockUsers');
    const nowTime = new Date().getTime();
    const invoices = await Invoices.query().where({
        paid_at: null,
    });

    const usersIdsToLock = [];
    invoices.forEach((invoice) => {
        if (nowTime > invoice.due_at.getTime()) {
            usersIdsToLock.push(invoice.users_id);
        }
    });

    let chunks = usersIdsToLock;
    if (usersIdsToLock.length > 1000) {
        chunks = _.chunk(usersIdsToLock, 1000);
    }
    if (chunks.length === usersIdsToLock.length) {
        chunks = [chunks];
    }
    for (const idChunk of chunks) {
        await Users.query().whereIn('id', idChunk).patch({ locked: true });
    }

    return usersIdsToLock;
};

const unlockUsers = async ({ userIdsToLock }) => {
    logger.debug('/services/invoices/unlockUsers');
    const lockedUsers = await Users.query().where({ locked: true });
    const lockedUserIds = lockedUsers.map(({ id }) => id);
    const usersIdsToUnlock = lockedUserIds.filter(
        (users_id) => !userIdsToLock.includes(users_id)
    );

    let chunks = usersIdsToUnlock;
    if (usersIdsToUnlock.length > 1000) {
        chunks = _.chunk(usersIdsToUnlock, 1000);
    }
    if (chunks.length === usersIdsToUnlock.length) {
        chunks = [chunks];
    }
    for (const idChunk of chunks) {
        await Users.query().whereIn('id', idChunk).patch({ locked: false });
    }
};

const handleLockedUser = async ({ users_id }) => {
    logger.debug('/services/invoices/handleLockedUser');
    const nowTime = new Date().getTime();
    const invoices = await Invoices.query().where({
        paid_at: null,
        users_id,
    });

    let locked = false;
    invoices.forEach((invoice) => {
        if (nowTime > invoice.due_at.getTime()) {
            locked = true;
        }
    });

    if (!locked) {
        await Users.query().where({ id: users_id }).patch({ locked });
    }

    return locked;
};

module.exports = {
    get,
    getLast,
    create,
    lockUsers,
    unlockUsers,
    handleLockedUser,
};
