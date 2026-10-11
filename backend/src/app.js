import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inventoryRoutes from './routes/inventoryRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import { initReservationWorker } from './workers/reservationWorker.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/reservations', reservationRoutes);


if (process.env.NODE_ENV !== 'test') {
  initReservationWorker();
  console.log('⚡ BullMQ Worker initialized and listening for jobs...');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

export default app;