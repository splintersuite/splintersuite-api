const Seasons = require('../models/Seasons');
const Users = require('../models/Users');
const _ = require('lodash');
const Invoices = require('../models/Invoices');

const lockPastDueUsers = async () => {
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

const handleLockedUser = async ({ users_id }) => {
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

const unlockUsers = async ({ userIdsToLock }) => {
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

const createInvoicesForSeason = async () => {
    const seasons = await Seasons.query().orderBy('end_date', 'desc');

    // seasons[0] will be the NEWEST season
    // season[1] is what i want to bill!

    if (seasons.length === 1) {
        // wait till next season
        return;
    }
    const seasonEndDate = seasons[1].end_date;
    const seasonStartDate = seasons[1].start_date;

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
            .whereBetween('earnings_date', [seasonStartDate, seasonEndDate]);
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
        invoices.push({
            users_id,
            season_id: seasons[1].id,
            discounted_due_at: threeDaysFromNow,
            due_at: twoWeeksFromNow,
            amount_due: _.round(
                _.sum(
                    earningsObj[users_id].map(
                        ({ earnings_dec }) => earnings_dec
                    )
                ) * 0.1,
                2
            ),
            season_name: seasons[1].name,
        });
    }

    if (invoices.length > 0) {
        await Invoices.query().insert(invoices);
    }
};

module.exports = {
    lockPastDueUsers,
    unlockUsers,
    createInvoicesForSeason,
    handleLockedUser,
};
