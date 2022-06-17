import express from 'express';
import { payInvoice } from '../controllers/Invoices';

const router = express.Router();

router.post('/:id', payInvoice);

export default router;
