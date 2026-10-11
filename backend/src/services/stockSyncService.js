import mysqlPool from '../config/database.js';
import redis from '../config/redis.js';

/**
 * Syncs ALL active inventory items from MySQL to Redis on app boot.
 */
export const syncAllStockToRedis = async () => {
  console.log('🔄 Syncing full inventory state from MySQL to Redis...');
  const [rows] = await mysqlPool.execute(
    `SELECT warehouse_id, product_id, (quantity - reserved_quantity) AS availableStock 
     FROM inventory`
  );

  for (const item of rows) {
    const available = Math.max(0, item.availableStock);
    const stockKey = `stock:${item.warehouse_id}:${item.product_id}`;
    await redis.set(stockKey, available);
  }

  console.log(`✅ Synced ${rows.length} inventory records to Redis.`);
};