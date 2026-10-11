import request from 'supertest';
import app from '../../src/app.js';
import redis from '../../src/config/redis.js';
import pool from '../../src/config/database.js';

describe('Integration: Warehouse Inventory Management', () => {
  let productId;
  let warehouseAId;
  let warehouseBId;

  beforeAll(async () => {
    // Clear test data
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM inventory');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM warehouses');
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  test('1. Create Product & Warehouses', async () => {
    // Create Product
    const prodRes = await request(app)
      .post('/api/v1/inventory/products')
      .send({ sku: 'IPHONE-15-128GB', name: 'iPhone 15 128GB Black' });

    expect(prodRes.status).toBe(201);
    expect(prodRes.body.success).toBe(true);
    productId = prodRes.body.data.id;

    // Create Warehouse A
    const whARes = await request(app)
      .post('/api/v1/inventory/warehouses')
      .send({ code: 'WH-MUMBAI', name: 'Mumbai Central Warehouse' });

    expect(whARes.status).toBe(201);
    warehouseAId = whARes.body.data.id;

    // Create Warehouse B
    const whBRes = await request(app)
      .post('/api/v1/inventory/warehouses')
      .send({ code: 'WH-DELHI', name: 'Delhi North Warehouse' });

    expect(whBRes.status).toBe(201);
    warehouseBId = whBRes.body.data.id;
  });

  test('2. Receive Stock (RECEIVE movement)', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/movements')
      .send({
        productId,
        toWarehouseId: warehouseAId,
        quantity: 100,
        movementType: 'RECEIVE',
        referenceId: 'PO-998811',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB count
    const [rows] = await pool.execute(
      'SELECT quantity FROM inventory WHERE warehouse_id = ? AND product_id = ?',
      [warehouseAId, productId]
    );
    expect(rows[0].quantity).toBe(100);

    // Verify Redis sync
    const redisStock = await redis.get(`stock:${warehouseAId}:${productId}`);
    expect(parseInt(redisStock, 10)).toBe(100);
  });

  test('3. Stock Adjustment for Damaged Goods (ADJUSTMENT movement)', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/movements')
      .send({
        productId,
        fromWarehouseId: warehouseAId,
        quantity: -5, // 5 units damaged
        movementType: 'ADJUSTMENT',
        referenceId: 'DMG-001',
      });

    expect(res.status).toBe(200);

    const [rows] = await pool.execute(
      'SELECT quantity FROM inventory WHERE warehouse_id = ? AND product_id = ?',
      [warehouseAId, productId]
    );
    expect(rows[0].quantity).toBe(95);
  });

  test('4. Transfer Stock Between Warehouses (TRANSFER movement)', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/movements')
      .send({
        productId,
        fromWarehouseId: warehouseAId,
        toWarehouseId: warehouseBId,
        quantity: 20,
        movementType: 'TRANSFER',
        referenceId: 'TRF-1002',
      });

    expect(res.status).toBe(200);

    // Check Warehouse A quantity (95 - 20 = 75)
    const [whA] = await pool.execute(
      'SELECT quantity FROM inventory WHERE warehouse_id = ? AND product_id = ?',
      [warehouseAId, productId]
    );
    expect(whA[0].quantity).toBe(75);

    // Check Warehouse B quantity (0 + 20 = 20)
    const [whB] = await pool.execute(
      'SELECT quantity FROM inventory WHERE warehouse_id = ? AND product_id = ?',
      [warehouseBId, productId]
    );
    expect(whB[0].quantity).toBe(20);
  });

  test('5. Prewarm Redis Stock from DB', async () => {
    // Deliberately tamper or purge Redis key
    await redis.del(`stock:${warehouseAId}:${productId}`);

    const res = await request(app)
      .post('/api/v1/inventory/prewarm')
      .send({
        warehouseId: warehouseAId,
        productId,
      });

    expect(res.status).toBe(200);
    expect(res.body.currentStock).toBe(75);

    const restoredRedisStock = await redis.get(`stock:${warehouseAId}:${productId}`);
    expect(parseInt(restoredRedisStock, 10)).toBe(75);
  });
});