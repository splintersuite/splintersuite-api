const earningsService = require('../services/earnings');

const getEarnings = async () => {
    const users_id = '14da27d4-4069-42cc-902d-1417a8f93b51';

    const data = await earningsService.get({ users_id });

    console.log('data', data);
};

getEarnings();
