import request from 'supertest';
import app from '../../src/app.js';
import redis from '../../src/config/redis.js';
import pool from '../../src/config/database.js';

describe('Integration: High-Concurrency Flash Sale & Payment Webhooks', () => {
  const productId = 'flash_prod_99';
  const warehouseId = 'flash_wh_01';
  const initialStock = 10;

  beforeAll(async () => {
    // Seed initial stock of 10 into Redis
    await redis.set(`stock:${warehouseId}:${productId}`, initialStock);

    // Insert dummy product & warehouse into MySQL to prevent foreign key errors during queue sync
    await pool.execute(
      'INSERT IGNORE INTO products (id, sku, name) VALUES (?, ?, ?)',
      [productId, 'FLASH-ITEM', 'Limited Edition Sneaker']
    );
    await pool.execute(
      'INSERT IGNORE INTO warehouses (id, code, name) VALUES (?, ?, ?)',
      [warehouseId, 'WH-SURAT', 'Surat Fulfillment Center']
    );
    await pool.execute(
      'INSERT INTO inventory (warehouse_id, product_id, quantity, reserved_quantity) VALUES (?, ?, 10, 0) ON DUPLICATE KEY UPDATE quantity=10, reserved_quantity=0',
      [warehouseId, productId]
    );
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  test('1,000 Concurrent Requests for 10 Stock Items (Zero Overselling Guarantee)', async () => {
    const totalRequests = 1000;
    const requestPromises = [];

    // Fire 1,000 parallel POST requests simultaneously
    for (let i = 0; i < totalRequests; i++) {
      requestPromises.push(
        request(app)
          .post('/api/v1/reservations')
          .send({
            userId: `usr_concurrent_${i}`,
            productId,
            warehouseId,
            quantity: 1,
          })
      );
    }

    const responses = await Promise.all(requestPromises);

    const successfulReservations = responses.filter((res) => res.status === 201);
    const rejectedReservations = responses.filter((res) => res.status === 400);

    // Assert strictly 10 reservations succeeded
    expect(successfulReservations.length).toBe(10);
    // Assert 990 requests were rejected
    expect(rejectedReservations.length).toBe(990);

    // Verify Redis stock is reduced exactly to 0
    const remainingStock = await redis.get(`stock:${warehouseId}:${productId}`);
    expect(parseInt(remainingStock, 10)).toBe(0);
  });

  test('Payment Webhook: Handle Payment Success', async () => {
    // Pick one created reservation ID
    const reservationId = 'res_test_webhook_success';

    // Insert mock pending reservation into DB
    await pool.execute(
      `INSERT INTO reservations (id, user_id, product_id, warehouse_id, quantity, status, expires_at)
       VALUES (?, 'usr_1', ?, ?, 1, 'PENDING', NOW() + INTERVAL 15 MINUTE)`,
      [reservationId, productId, warehouseId]
    );

    const res = await request(app)
      .post('/api/v1/reservations/webhook/payment')
      .send({
        eventId: 'evt_pay_001',
        reservationId,
        paymentStatus: 'SUCCESS',
      });

    expect(res.status).toBe(200);

    // Verify reservation status updated to CONFIRMED
    const [rows] = await pool.execute('SELECT status FROM reservations WHERE id = ?', [reservationId]);
    expect(rows[0].status).toBe('CONFIRMED');
  });

  test('Payment Webhook: Idempotency Check (Duplicate Webhooks)', async () => {
    const reservationId = 'res_test_webhook_idempotency';

    await pool.execute(
      `INSERT INTO reservations (id, user_id, product_id, warehouse_id, quantity, status, expires_at)
       VALUES (?, 'usr_2', ?, ?, 1, 'PENDING', NOW() + INTERVAL 15 MINUTE)`,
      [reservationId, productId, warehouseId]
    );

    // First call
    await request(app)
      .post('/api/v1/reservations/webhook/payment')
      .send({
        eventId: 'evt_duplicate_99',
        reservationId,
        paymentStatus: 'SUCCESS',
      });

    // Duplicate second call with same eventId
    const res = await request(app)
      .post('/api/v1/reservations/webhook/payment')
      .send({
        eventId: 'evt_duplicate_99',
        reservationId,
        paymentStatus: 'SUCCESS',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('already processed');
  });

  test('Payment Webhook: Payment Failed (Release Stock Back to Redis)', async () => {
    const reservationId = 'res_test_webhook_failed';

    await pool.execute(
      `INSERT INTO reservations (id, user_id, product_id, warehouse_id, quantity, status, expires_at)
       VALUES (?, 'usr_3', ?, ?, 1, 'PENDING', NOW() + INTERVAL 15 MINUTE)`,
      [reservationId, productId, warehouseId]
    );

    const initialRedisStock = parseInt(await redis.get(`stock:${warehouseId}:${productId}`), 10);

    const res = await request(app)
      .post('/api/v1/reservations/webhook/payment')
      .send({
        eventId: 'evt_fail_100',
        reservationId,
        paymentStatus: 'FAILED',
      });

    expect(res.status).toBe(200);

    // Verify reservation marked CANCELLED
    const [rows] = await pool.execute('SELECT status FROM reservations WHERE id = ?', [reservationId]);
    expect(rows[0].status).toBe('CANCELLED');

    // Verify stock was incremented back in Redis (+1)
    const newRedisStock = parseInt(await redis.get(`stock:${warehouseId}:${productId}`), 10);
    expect(newRedisStock).toBe(initialRedisStock + 1);
  });
});