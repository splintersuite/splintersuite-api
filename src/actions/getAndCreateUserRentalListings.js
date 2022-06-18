import UserRentalListings from '../models/UserRentalListings.js';
import _ from 'lodash';

export const createNewRentalListings = async ({
    // users_id,
    rentalListings,
}) => {
    console.log(`createNewRentalListings start`);
    console.log(`rentalListings `);
    console.log(rentalListings);

    let allNewListings = [];

    // allNewListings = [...newRentalListings];
    // console.log('allNewListings after adding newRentalListings');
    // console.log(allNewListings);
    // allNewListings = [...rentalRelistings];
    // console.log('allNewListings after adding rentalRelistings: ');
    // console.log(allNewListings);

    let chunks = rentalListings;

    if (rentalListings.length > 1000) {
        chunks = _.chunk(rentalListingss, 1000);
    }

    if (chunks.length === rentalListings.length) {
        chunks = [chunks];
    }
    for (const transChunk of chunks) {
        console.log('transChunk: ');
        console.log(transChunk);
        await UserRentalListings.query().insert(transChunk);
    }

    return;
};
