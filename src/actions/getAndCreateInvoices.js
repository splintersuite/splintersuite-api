import Invoices from '../models/Invoices';
import { getMostRecentSeason } from './insertBrawlAndSeasonData';

export const getRecentSeasonInvoicesForUsersId = async ({ users_id }) => {
    console.log(`getInvoiceForUser start`);

    const invoice = await Invoices.query()
        .join('season', { 'invoices.season_id': 'seasons.id' })
        .select('invoices.*', 'seasons.season_name')
        .where({ users_id });

    console.log('invoice: ');
    console.log(invoice);

    return invoice;
};

export const createInvoiceForUsersId = async ({ users_id }) => {
    console.log('createInvoiceForUsersId start');
    const recentSeason = await getMostRecentSeason();

    const now = new Date();
    const invoice = await Invoices.query().insert({
        season_id: recentSeason.season_id,
        users_id,
        discounted_due_at: now,
        due_at: now,
        amount_due: 1,
    });
    console.log('created invoice: ');
    console.log(invoice);
    return invoice;
};
