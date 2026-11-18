import rateLimit from 'express-rate-limit';

// Standard API limiter: 100 requests per 15 minutes
export const standardApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Strict limiter for authentication & password attempts: 10 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Transfer initiation limiter: 30 new transfers per hour per IP
export const transferInitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Hourly transfer creation limit exceeded. Please wait or log in.' },
});

// High-throughput chunk upload limiter: 2000 requests per 15 minutes
export const chunkUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
});
