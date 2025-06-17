import express, { Application } from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './router/routes';
import cookieParser from 'cookie-parser'

dotenv.config();

const app: Application = express();

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
