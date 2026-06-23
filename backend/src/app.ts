import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { auditMiddleware } from './middleware/auditMiddleware';

const app = express();

// CORS whitelist - allow both local dev and production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://phuphatcorp.scrapetool.cloud',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(auditMiddleware);

// Serve uploaded fuel images
app.use('/uploads/fuel-images', express.static(path.resolve('uploads/fuel-images')));

// Serve uploaded inspection files
app.use('/uploads/inspection-images', express.static(path.resolve('uploads/inspection-images')));

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
