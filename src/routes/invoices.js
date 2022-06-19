import express from 'express';
import { payInvoice, getInvoices } from '../controllers/Invoices.js';

const router = express.Router();

router.post('/:id', payInvoice);

router.get('/:username', getInvoices);

export default router;
