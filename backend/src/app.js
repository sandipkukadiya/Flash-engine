import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inventoryRoutes from './routes/inventoryRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import { syncAllStockToRedis } from './services/stockSyncService.js';
import { initReservationWorker } from './workers/reservationWorker.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/reservations', reservationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server listening on port ${PORT}`);

  try {
    // 1. Sync Redis cache from MySQL source of truth on startup
    await syncAllStockToRedis();

    // 2. Initialize BullMQ Workers
    if (process.env.NODE_ENV !== 'test') {
      initReservationWorker();
      console.log('⚡ BullMQ Worker initialized.');
    }
  } catch (error) {
    console.error('❌ Failed to initialize startup services:', error.message);
  }
});

export default app;