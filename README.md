# ⚡ High-Concurrency Flash-Sale Warehouse Inventory & Reservation System
An enterprise-grade, high-concurrency inventory management and flash-sale reservation platform designed to handle massive throughput with **zero-overselling guarantees**, atomic Redis hot-cache checks, and asynchronous MySQL persistence.

## 🛠️ Tech Stack & Versions
**Backend Runtime** | Node.js (ES Modules) | `v20.x+ | Core asynchronous server execution |
**Framework** | Express.js | `v4.19.x` | RESTful API routing and middleware |
**Database** | MySQL | `v8.0` | Primary source of truth & relational persistence |
**Caching / Hot Layer** | Redis | `v7.x` | Ultra-fast atomic stock checks (Lua scripting) |
**Async Queue** | BullMQ | `v5.x` | Background workers for DB reconciliation & persistence |
**Frontend UI** | React, TypeScript, Vite | `v18.x`, `v5.x` | Admin dashboard & load-test simulator |
**Styling** | Tailwind CSS | `v3.4.x` | Utility-first responsive design UI |


# 🚀 Project Setup Instructions
## Prerequisites
* **Node.js** (`v18+` recommended)
* **Docker & Docker Compose** (for running MySQL and Redis locally)

### 1. Clone & Install Dependencies
Navigate to your workspace and install dependencies for both backend and frontend:

    ```powershell
    # Backend Setup
    cd backend
    npm install

    # Frontend Setup
    cd ../frontend
    npm install

### 2. Create a .env file inside the backend/ directory:
    PORT=3000
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=password
    DB_NAME=warehouse_system
    REDIS_HOST=localhost
    REDIS_PORT=6379

### 3. Start Database & Cache Containers (Docker)
#### Start MySQL 8.0
    docker run -d --name warehouse-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=warehouse_system mysql:8.0
#### Start Redis 7
    docker run -d --name warehouse-redis -p 6379:6379 redis:7-alpine


### 4. Run Database Migrations & Seeding
#### For Window
    Get-Content schema.sql | docker exec -i warehouse-mysql mysql -u root -ppassword warehouse_system
    npm run seed # For Seeding

### 5. Run the Application
##### Start Backend API & BullMQ Worker:
    cd backend
    npm run dev

##### Start Frontend Dashboard (in a separate terminal):
    cd ../frontend
    npm run dev

# ⚡Deployment Instructions

## 1. Build Frontend for Production:
    cd frontend
    npm run build

## 2. Run Backend with PM2
    cd backend
    npm install -g pm2
    pm2 start src/app.js --name "flash-sale-api"


# Project Summary
Initially, I considered using MySQL row-level locking (SELECT ... FOR UPDATE) for bookings. However, due to concurrency bottlenecks and potential connection pool exhaustion under heavy traffic, I integrated Redis to handle high-throughput reservation caching and distributed locks.

## 1. Approach
The architecture implements a Dual-Layer Concurrency Model:

### The Hot Layer (Redis + Lua): 
Flash-sale requests check and decrement stock in Redis via atomic Lua scripts in microseconds, completely bypassing database lock contention during traffic spikes.

### The Ground Truth (MySQL + FOR UPDATE): 
Stock movements, transfers, adjustments, and payment verifications are handled inside ACID-compliant MySQL transactions.

### Async Decoupling (BullMQ): 
Reservation creation events are queued and asynchronously persisted to MySQL, preventing HTTP blocking.

### Instant Sync: 
Stock adjustments (RECEIVE, ADJUSTMENT, TRANSFER) instantly update both MySQL and Redis in real-time pipelines with strict availability checks (quantity - reserved_quantity).

### 15-Minute Reservation TTL & Sweeper: 
Abandoned carts and unpaid reservations hold stock for a strict 15-minute window. Redis keys and MySQL pending rows automatically expire, and a background cron sweeper restores the stock back to inventory pools if payment is not completed in time.


## 2. What I Liked
Crafting the atomic Redis Lua scripts to handle concurrent flash-sale requests without race conditions or overselling.Building the seamless dual-sync bridge where MySQL remains the infallible source of truth while Redis acts as a high-speed accelerator.

## 3. Challenges Faced    
Managing synchronization edge cases between asynchronous BullMQ workers and incoming instant payment webhooks (/webhook/payment). Resolved by implementing a fallback check (checking Redis hot-cache before querying MySQL).

## 4. Estimated Time Spent
Total Time: ~8 hours across architecture design, database schema modeling, Redis Lua scripting, BullMQ integration, and frontend debugging.


📦 Sample Test Data & Seeding

    The automated seeder (backend/src/seed.js) populates the following isolated test entities:

    Products:
        prod_flash_demo (SNEAKER-AIR-LTD) — Limited Edition Air Sneakers
        prod_test_concurrency (IPHONE-16-PRO) — iPhone 16 Pro 256GB
        prod_macbook_m3 (MACBOOK-M3-MAX) — MacBook Pro 16 M3 Max

    Warehouses:
        wh_surat_01 — Surat Fulfillment Center
        wh_mumbai_01 — Mumbai West Logistics Hub
        wh_delhi_01 — Delhi North Central Warehouse
        wh_test_1 — Automated Test Facility   


