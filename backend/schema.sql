-- Create Database
CREATE DATABASE IF NOT EXISTS warehouse_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE warehouse_system;

-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_sku (sku)
) ENGINE=InnoDB;

-- 2. Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_warehouses_code (code)
) ENGINE=InnoDB;

-- 3. Inventory Table (Core stock level and locked holds)
CREATE TABLE IF NOT EXISTS inventory (
    warehouse_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_id, product_id),
    CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_inventory_lookup (warehouse_id, product_id)
) ENGINE=InnoDB;

-- 4. Reservations Table (Flash-sale cart holds & 15-min TTL tracking)
CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    warehouse_id VARCHAR(64) NOT NULL,
    quantity INT NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservation_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_reservation_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    INDEX idx_reservations_status_expiry (status, expires_at),
    INDEX idx_reservations_user (user_id)
) ENGINE=InnoDB;

-- 5. Payment Webhooks Table (Idempotency deduplication)
CREATE TABLE IF NOT EXISTS payment_webhooks (
    event_id VARCHAR(128) PRIMARY KEY,
    reservation_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSON NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_webhook_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    INDEX idx_webhooks_reservation (reservation_id)
) ENGINE=InnoDB;

-- 6. Stock Movements Table (Audit trail for receive, adjust, transfer)
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL,
    from_warehouse_id VARCHAR(64) DEFAULT NULL,
    to_warehouse_id VARCHAR(64) DEFAULT NULL,
    quantity INT NOT NULL,
    movement_type ENUM('RECEIVE', 'ADJUSTMENT', 'TRANSFER') NOT NULL,
    reference_id VARCHAR(128) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movement_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_movement_from_wh FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_movement_to_wh FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
    INDEX idx_movements_product_date (product_id, created_at),
    INDEX idx_movements_type (movement_type)
) ENGINE=InnoDB;