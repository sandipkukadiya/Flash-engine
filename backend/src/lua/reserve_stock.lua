local stock_key = KEYS[1]
local reservation_key = KEYS[2]
local requested_qty = tonumber(ARGV[1])
local user_id = ARGV[2]
local product_id = ARGV[3]
local warehouse_id = ARGV[4]
local ttl_seconds = tonumber(ARGV[5])

local current_stock = tonumber(redis.call('GET', stock_key) or '0')

if current_stock >= requested_qty then
    redis.call('DECRBY', stock_key, requested_qty)
    redis.call('HSET', reservation_key, 
        'userId', user_id,
        'productId', product_id,
        'warehouseId', warehouse_id,
        'quantity', requested_qty,
        'status', 'PENDING'
    )
    redis.call('EXPIRE', reservation_key, ttl_seconds)
    return 1
else
    return 0
end