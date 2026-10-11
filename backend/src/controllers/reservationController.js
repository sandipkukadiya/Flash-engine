import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import redis from '../config/redis.js';
import pool from '../config/database.js';
import { reservationQueue } from '../queues/reservationQueue.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const luaScriptPath = path.join(__dirname, '../lua/reserve_stock.lua');
const reserveStockLua = fs.readFileSync(luaScriptPath, 'utf8');

redis.defineCommand('reserveStock', {
  numberOfKeys: 2,
  lua: reserveStockLua,
});

export const reserveStock = async (req, res) => {
  const { userId, productId, warehouseId, quantity = 1 } = req.body;
  const reservationId = `res_${uuidv4()}`;
  const stockKey = `stock:${warehouseId}:${productId}`;
  const reservationKey = `reservation:${reservationId}`;
  const ttlSeconds = 900; // 15 Minutes

  try {
    const result = await redis.reserveStock(
      stockKey,
      reservationKey,
      quantity,
      userId,
      productId,
      warehouseId,
      ttlSeconds
    );

    if (result === 0) {
      return res.status(400).json({ success: false, message: 'Out of stock.' });
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;

    await reservationQueue.add('PERSIST_RESERVATION', {
      type: 'PERSIST_RESERVATION',
      data: { reservationId, userId, productId, warehouseId, quantity, expiresAt }
    });

    await reservationQueue.add('RELEASE_EXPIRED_STOCK', {
      type: 'RELEASE_EXPIRED_STOCK',
      data: { reservationId }
    }, { delay: ttlSeconds * 1000 });

    return res.status(201).json({
      success: true,
      data: { reservationId, expiresInSeconds: ttlSeconds }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const handlePaymentWebhook = async (req, res) => {
  const { eventId, reservationId, paymentStatus } = req.body;
  const connection = await pool.getConnection();

  try {
    const [existing] = await connection.execute('SELECT event_id FROM payment_webhooks WHERE event_id = ?', [eventId]);
    if (existing.length > 0) {
      return res.status(200).json({ message: 'Webhook already processed.' });
    }

    await connection.beginTransaction();

    await connection.execute(
      'INSERT INTO payment_webhooks (event_id, reservation_id, event_type, payload) VALUES (?, ?, ?, ?)',
      [eventId, reservationId, paymentStatus, JSON.stringify(req.body)]
    );

    const [rows] = await connection.execute(
      'SELECT * FROM reservations WHERE id = ? FOR UPDATE',
      [reservationId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    const reservation = rows[0];

    if (reservation.status === 'PENDING') {
      if (paymentStatus === 'SUCCESS') {
        await connection.execute(`UPDATE reservations SET status = 'CONFIRMED' WHERE id = ?`, [reservationId]);
        await connection.execute(
          `UPDATE inventory SET reserved_quantity = reserved_quantity - ? WHERE warehouse_id = ? AND product_id = ?`,
          [reservation.quantity, reservation.warehouse_id, reservation.product_id]
        );
        await redis.del(`reservation:${reservationId}`);

      } else if (paymentStatus === 'FAILED') {
        await connection.execute(`UPDATE reservations SET status = 'CANCELLED' WHERE id = ?`, [reservationId]);
        await connection.execute(
          `UPDATE inventory SET quantity = quantity + ?, reserved_quantity = reserved_quantity - ? WHERE warehouse_id = ? AND product_id = ?`,
          [reservation.quantity, reservation.quantity, reservation.warehouse_id, reservation.product_id]
        );
        await redis.incrby(`stock:${reservation.warehouse_id}:${reservation.product_id}`, reservation.quantity);
        await redis.del(`reservation:${reservationId}`);
      }
    }

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Webhook processed successfully.' });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
};