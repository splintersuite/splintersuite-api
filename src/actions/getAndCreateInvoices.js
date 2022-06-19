import Invoices from '../models/Invoices.js';
import { getMostRecentSeason } from './insertBrawlAndSeasonData.js';

export const getRecentSeasonInvoicesForUsersId = async ({ users_id }) => {
    const invoice = await Invoices.query()
        .join('season', { 'invoices.season_id': 'seasons.id' })
        .select('invoices.*', 'seasons.season_name')
        .where({ users_id });

    return invoice;
};

export const createInvoiceForUsersId = async ({ users_id }) => {
    const recentSeason = await getMostRecentSeason();

    const now = new Date();
    const invoice = await Invoices.query().insert({
        season_id: recentSeason.id,
        users_id,
        discounted_due_at: now,
        due_at: now,
        amount_due: 1,
    });
    return invoice;
};

export const getInvoicesForUser = async ({ users_id }) => {
    const invoices = await Invoices.query().where({ users_id });

    if (!Array.isArray(invoices)) {
        throw new Error('database errored on querying invoices');
    }

    return invoices;
};
