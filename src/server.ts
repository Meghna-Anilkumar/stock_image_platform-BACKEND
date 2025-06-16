import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error('[server] Failed to load .env file:', dotenvResult.error);
} else {
  console.log('[server] .env file loaded successfully');
}

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || '';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
