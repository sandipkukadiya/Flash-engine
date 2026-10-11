import Redis from 'ioredis-mock';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Unit: Atomic Reserve Stock Redis Lua Script', () => {
  let redis;

  beforeAll(() => {
    redis = new Redis();
    const luaScriptPath = path.join(__dirname, '../../src/lua/reserve_stock.lua');
    const reserveStockLua = fs.readFileSync(luaScriptPath, 'utf8');

    redis.defineCommand('reserveStock', {
      numberOfKeys: 2,
      lua: reserveStockLua,
    });
  });

  afterEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  test('should successfully reserve stock when inventory is available', async () => {
    const stockKey = 'stock:wh_01:sku_1001';
    const reservationKey = 'reservation:res_001';
    
    // Seed initial stock of 5
    await redis.set(stockKey, 5);

    const result = await redis.reserveStock(
      stockKey,
      reservationKey,
      2,              // ARGV[1]: requested_qty
      'user_123',     // ARGV[2]: user_id
      'sku_1001',     // ARGV[3]: product_id
      'wh_01',        // ARGV[4]: warehouse_id
      900             // ARGV[5]: ttl_seconds (15 mins)
    );

    expect(result).toBe(1); // Success code

    // Verify stock was decremented from 5 to 3
    const remainingStock = await redis.get(stockKey);
    expect(parseInt(remainingStock, 10)).toBe(3);

    // Verify reservation hash details
    const reservationData = await redis.hgetall(reservationKey);
    expect(reservationData.userId).toBe('user_123');
    expect(reservationData.quantity).toBe('2');
    expect(reservationData.status).toBe('PENDING');

    // Verify TTL was set
    const ttl = await redis.ttl(reservationKey);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(900);
  });

  test('should reject reservation when stock is insufficient', async () => {
    const stockKey = 'stock:wh_01:sku_1001';
    const reservationKey = 'reservation:res_002';

    // Seed stock of 1
    await redis.set(stockKey, 1);

    // Request 2 items when only 1 exists
    const result = await redis.reserveStock(
      stockKey,
      reservationKey,
      2,
      'user_123',
      'sku_1001',
      'wh_01',
      900
    );

    expect(result).toBe(0); // Out of Stock code

    // Verify stock was NOT decremented
    const remainingStock = await redis.get(stockKey);
    expect(parseInt(remainingStock, 10)).toBe(1);

    // Verify no reservation hash was created
    const exists = await redis.exists(reservationKey);
    expect(exists).toBe(0);
  });
});