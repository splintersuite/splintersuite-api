import express from 'express';
import { addRentalListings } from '../controllers/RentalListings.js';
const router = express.Router();

router.post(`/newrentallistings`, addRentalListings);

export default router;
