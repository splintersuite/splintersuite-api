const { getUser } = require('../actions/createAndGetUser');
const {
    createNewRentalListings,
} = require('../actions/getAndCreateUserRentalListings');

const addRentalListings = async (req, res, next) => {
    // const { username } = req.params;
    const { rentalListings } = req.body;
    console.debug('rentalListings :');
    console.debug(rentalListings);
    // const user = await getUser([username]);

    //await createNewRentalListings({users_id, })
    if (!rentalListings || rentalListings.length === 0) {
    } else {
        await createNewRentalListings({ rentalListings });
    }
    res.send('ok');
};

module.exports = { addRentalListings };
