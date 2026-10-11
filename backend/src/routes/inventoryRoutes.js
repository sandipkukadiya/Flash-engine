import express from 'express';
import {
  getProducts,
  getWarehouses,
  getInventory,
  createProduct,
  createWarehouse,
  recordStockMovement,
  prewarmRedis,
} from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/products', getProducts);
router.post('/products', createProduct);
router.get('/warehouses', getWarehouses);
router.post('/warehouses', createWarehouse);
router.get('/', getInventory);
router.post('/movements', recordStockMovement);
router.post('/prewarm', prewarmRedis);

export default router;