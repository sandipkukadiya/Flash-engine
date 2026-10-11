import { Queue } from 'bullmq';
import redis from '../config/redis.js';

export const reservationQueue = new Queue('reservation-db-sync', {
  connection: redis,
});