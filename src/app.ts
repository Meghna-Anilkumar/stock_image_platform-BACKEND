import express, { Application } from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './router/routes';
import cookieParser from 'cookie-parser'

dotenv.config();

const app: Application = express();

console.log('[app] Environment variables:', {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '[HIDDEN]' : undefined,
  JWT_SECRET: process.env.JWT_SECRET ? '[HIDDEN]' : undefined,
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? '[HIDDEN]' : undefined,
  ORIGIN: process.env.ORIGIN,
  NODE_ENV: process.env.NODE_ENV,
});
app.use(
    cors({
        origin: process.env.ORIGIN || 'http://localhost:5173',
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    })
);
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

app.use('/', routes);

export default app;
