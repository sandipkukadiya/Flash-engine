import pool from './config/database.js';
import redis from './config/redis.js';

const SEED_DATA = {
  products: [
    { id: 'prod_flash_demo', sku: 'SNEAKER-AIR-LTD', name: 'Limited Edition Air Sneakers' },
    { id: 'prod_test_concurrency', sku: 'IPHONE-16-PRO', name: 'iPhone 16 Pro 256GB' },
    { id: 'prod_macbook_m3', sku: 'MACBOOK-M3-MAX', name: 'MacBook Pro 16 M3 Max' },
  ],
  warehouses: [
    { id: 'wh_surat_01', code: 'WH-SURAT-01', name: 'Surat Fulfillment Center' },
    { id: 'wh_mumbai_01', code: 'WH-MUMBAI-01', name: 'Mumbai West Logistics Hub' },
    { id: 'wh_delhi_01', code: 'WH-DELHI-01', name: 'Delhi North Central Warehouse' },
    { id: 'wh_test_1', code: 'WH-TEST-01', name: 'Automated Test Facility' },
  ],
  inventory: [
    { warehouseId: 'wh_surat_01', productId: 'prod_flash_demo', quantity: 10 },
    { warehouseId: 'wh_mumbai_01', productId: 'prod_macbook_m3', quantity: 20 },
    { warehouseId: 'wh_test_1', productId: 'prod_test_concurrency', quantity: 10 },
  ],
};

export const seedDatabase = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('🌱 Starting database seeding...');
    await connection.beginTransaction();

    // 1. Seed Products
    for (const prod of SEED_DATA.products) {
      await connection.execute(
        `INSERT INTO products (id, sku, name) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name), sku = VALUES(sku)`,
        [prod.id, prod.sku, prod.name]
      );
    }
    console.log(`✅ Seeded ${SEED_DATA.products.length} products.`);

    // 2. Seed Warehouses
    for (const wh of SEED_DATA.warehouses) {
      await connection.execute(
        `INSERT INTO warehouses (id, code, name) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code)`,
        [wh.id, wh.code, wh.name]
      );
    }
    console.log(`✅ Seeded ${SEED_DATA.warehouses.length} warehouses.`);

    // 3. Seed Inventory & Pre-warm Redis Keys
    for (const item of SEED_DATA.inventory) {
      await connection.execute(
        `INSERT INTO inventory (warehouse_id, product_id, quantity, reserved_quantity) 
         VALUES (?, ?, ?, 0) 
         ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), reserved_quantity = 0`,
        [item.warehouseId, item.productId, item.quantity]
      );

      // Pre-warm corresponding Redis Stock Key
      const stockKey = `stock:${item.warehouseId}:${item.productId}`;
      await redis.set(stockKey, item.quantity);
      console.log(`  └─ Synced Redis Key [${stockKey}] = ${item.quantity}`);
    }
    console.log(`✅ Seeded physical inventory and pre-warmed Redis cache.`);

    await connection.commit();
    console.log('🚀 Seeding completed successfully!');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Database Seeding Failed:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    await redis.quit();
    await pool.end();
  }
};

// Execute if run directly via CLI
if (process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}