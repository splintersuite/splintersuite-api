const dotenv = require('dotenv');
dotenv.config();

const Users = require('../models/Users');
const Invoices = require('../models/Invoices');

const insertSeason = async ({ username }) => {
    const now = new Date();
    await Invoices.query()
        .insert({
            users_id: '0f16186c-744c-4d68-8dba-99e7ee91a690',
            season_id: '001e1154-d6e3-4697-849e-ed8d3a391fdd',
            discounted_due_at: new Date(),
            due_at: new Date(),
            amount_due: 1,
            season_name: 'lolxd',
        })
        .catch((err) => {
            console.log(err);
        });
};

const patcbUser = async ({ username }) => {
    const now = new Date();
    await Users.query()
        .where({ username })
        .patch({
            username: 'wtf',
        })
        .catch((err) => {
            console.log(err);
        });
};

insertSeason({ username: 'genepoolcardlord' });

const queryJboxx = async () => {
    const users = await Users.query().catch((err) => {
        console.log(err);
    });

    console.log('users', users);
};

// queryJboxx();
