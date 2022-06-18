import express from 'express';
import { payInvoice, getInvoices } from '../controllers/Invoices';

const router = express.Router();

router.post('/:id', payInvoice);

router.get('/:username', getInvoices);

export default router;
