import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import mysqlPool from '../config/database.js';

export const initReservationWorker = () => {
  return new Worker(
    'reservation-db-sync',
    async (job) => {
      const { type, data } = job.data;
      const connection = await mysqlPool.getConnection();

      try {
        await connection.beginTransaction();

        if (type === 'PERSIST_RESERVATION') {
          const { reservationId, userId, productId, warehouseId, quantity, expiresAt } = data;

          await connection.execute(
            `INSERT INTO reservations (id, user_id, product_id, warehouse_id, quantity, status, expires_at)
             VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
            [reservationId, userId, productId, warehouseId, quantity, new Date(expiresAt)]
          );

          await connection.execute(
            `UPDATE inventory 
             SET quantity = quantity - ?, reserved_quantity = reserved_quantity + ?
             WHERE warehouse_id = ? AND product_id = ?`,
            [quantity, quantity, warehouseId, productId]
          );

        } else if (type === 'RELEASE_EXPIRED_STOCK') {
          const { reservationId } = data;

          const [rows] = await connection.execute(
            `SELECT * FROM reservations WHERE id = ? AND status = 'PENDING' FOR UPDATE`,
            [reservationId]
          );

          if (rows.length > 0) {
            const res = rows[0];

            await connection.execute(
              `UPDATE reservations SET status = 'EXPIRED' WHERE id = ?`,
              [reservationId]
            );

            await connection.execute(
              `UPDATE inventory 
               SET quantity = quantity + ?, reserved_quantity = reserved_quantity - ?
               WHERE warehouse_id = ? AND product_id = ?`,
              [res.quantity, res.quantity, res.warehouse_id, res.product_id]
            );

            const stockKey = `stock:${res.warehouse_id}:${res.product_id}`;
            await redis.incrby(stockKey, res.quantity);
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        console.error(`[Worker Error] Job ${job.id} failed:`, error);
        throw error;
      } finally {
        connection.release();
      }
    },
    { connection: redis, concurrency: 10 }
  );
};