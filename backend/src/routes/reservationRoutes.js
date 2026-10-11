import express from 'express';
import { reserveStock, handlePaymentWebhook } from '../controllers/reservationController.js';

const router = express.Router();

router.post('/', reserveStock);
router.post('/webhook/payment', handlePaymentWebhook);

export default router;