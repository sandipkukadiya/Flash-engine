import pool from '../config/database.js';
import redis from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';

export const getProducts = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM products ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
};

export const getWarehouses = async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM warehouses ORDER BY code ASC');
  res.json({ success: true, data: rows });
};

export const getInventory = async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT i.*, p.sku, p.name as product_name, w.code as warehouse_code, w.name as warehouse_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
  `);
  res.json({ success: true, data: rows });
};

export const createProduct = async (req, res) => {
  const { sku, name } = req.body;
  // const id = uuidv4();
  const id = sku.toLowerCase().replace(/[-\s]+/g, '_');
  await pool.execute('INSERT INTO products (id, sku, name) VALUES (?, ?, ?)', [id, sku, name]);
  res.status(201).json({ success: true, data: { id, sku, name } });
};

export const createWarehouse = async (req, res) => {
  const { code, name } = req.body;
  // const id = uuidv4();
  const id = code.toLowerCase().replace(/[-\s]+/g, '_');
  await pool.execute('INSERT INTO warehouses (id, code, name) VALUES (?, ?, ?)', [id, code, name]);
  res.status(201).json({ success: true, data: { id, code, name } });
};

export const recordStockMovement = async (req, res) => {
  const { productId, fromWarehouseId, toWarehouseId, quantity, movementType, referenceId } = req.body;
  const qty = parseInt(quantity, 10);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (movementType === 'RECEIVE') {
      await connection.execute(
        `INSERT INTO inventory (warehouse_id, product_id, quantity, reserved_quantity) VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
        [toWarehouseId, productId, qty, qty]
      );
      await redis.incrby(`stock:${toWarehouseId}:${productId}`, qty);

    } else if (movementType === 'ADJUSTMENT') {
      await connection.execute(
        `UPDATE inventory SET quantity = quantity - ? WHERE warehouse_id = ? AND product_id = ?`,
        [qty, fromWarehouseId, productId]
      );
      await redis.incrby(`stock:${fromWarehouseId}:${productId}`, qty);

    } else if (movementType === 'TRANSFER') {
      if (!fromWarehouseId || !toWarehouseId) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Transfer requires both fromWarehouseId and toWarehouseId.' });
      }

      // 1. Lock and check available stock at the source warehouse
      const [sourceRows] = await connection.execute(
        `SELECT quantity AS availableStock 
         FROM inventory 
         WHERE warehouse_id = ? AND product_id = ? 
         FOR UPDATE`,
        [fromWarehouseId, productId]
      );

      if (sourceRows.length === 0 || sourceRows[0].availableStock < qty) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient stock for transfer. Available: ${sourceRows[0]?.availableStock || 0}, Requested: ${qty}` 
        });
      }

      // 2. Deduct from source warehouse
      await connection.execute(
        `UPDATE inventory SET quantity = quantity - ? WHERE warehouse_id = ? AND product_id = ?`,
        [qty, fromWarehouseId, productId]
      );

      // 3. Add to destination warehouse (Upsert)
      await connection.execute(
        `INSERT INTO inventory (warehouse_id, product_id, quantity, reserved_quantity) VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
        [toWarehouseId, productId, qty, qty]
      );

      // 4. Update Redis cache atomically via pipeline
      const sourceKey = `stock:${fromWarehouseId}:${productId}`;
      const destKey = `stock:${toWarehouseId}:${productId}`;

      const pipeline = redis.pipeline();
      pipeline.decrby(sourceKey, qty);
      pipeline.incrby(destKey, qty);
      await pipeline.exec();
    }

    const movementId = uuidv4();
    await connection.execute(
      `INSERT INTO stock_movements (id, product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [movementId, productId, fromWarehouseId || null, toWarehouseId || null, qty, movementType, referenceId || null]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Stock movement recorded successfully.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
};

export const prewarmRedis = async (req, res) => {
  const { warehouseId, productId } = req.body;
  const [rows] = await pool.execute(
    'SELECT quantity FROM inventory WHERE warehouse_id = ? AND product_id = ?',
    [warehouseId, productId]
  );

  const stock = rows.length > 0 ? rows[0].quantity : 0;
  await redis.set(`stock:${warehouseId}:${productId}`, stock);

  res.json({ success: true, message: `Redis stock synced to ${stock}`, currentStock: stock });
};
