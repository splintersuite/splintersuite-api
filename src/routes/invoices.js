import express from 'express';
import { payInvoice, createInvoice } from '../controllers/Invoices.js';

const router = express.Router();

router.post('/:id', payInvoice);

router.get('/:username', createInvoice);

export default router;
