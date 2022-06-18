import express from 'express';
import {
    payInvoice,
    getInvoices,
    createInvoice,
} from '../controllers/Invoices';

const router = express.Router();

router.post('/:id', payInvoice);

router.get('/invoices', getInvoices);

router.get('/:username', createInvoice);

export default router;
