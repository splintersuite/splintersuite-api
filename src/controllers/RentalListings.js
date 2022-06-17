import { getUser } from '../actions/createAndGetUser.js';
import { createNewRentalListings } from '../actions/getAndCreateUserRentalListings.js';

export const addRentalListings = async (req, res, next) => {
    // const { username } = req.params;
    const { rentalListings } = req.body;
    console.debug('rentalListings :');
    console.debug(rentalListings);
    // const user = await getUser([username]);

    //await createNewRentalListings({users_id, })

    await createNewRentalListings({ rentalListings });
    res.send('ok');
};
