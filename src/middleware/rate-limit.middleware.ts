import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate Limiting Middleware Configuration
 * API so'rovlarini cheklash orqali DDoS va brute-force hujumlardan himoyalanish
 */

// Umumiy API uchun rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  limit: 100, // Har bir IP uchun 15 daqiqada 100 ta so'rov
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      retryAfter: '15 minutes',
    },
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later.',
        retryAfter: '15 minutes',
      },
    });
  },
});

// Auth endpointlari uchun qattiq limiter (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  limit: 10, // Har bir IP uchun 15 daqiqada 10 ta so'rov
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message:
        'Too many authentication attempts, please try again after 15 minutes.',
      retryAfter: '15 minutes',
    },
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message:
          'Too many authentication attempts, please try again after 15 minutes.',
        retryAfter: '15 minutes',
      },
    });
  },
  // Muvaffaqiyatsiz loginlarni alohida hisoblash
  skipSuccessfulRequests: true,
});

// Booking yaratish uchun limiter (spam oldini olish)
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 soat
  limit: 20, // Har bir IP uchun 1 soatda 20 ta booking
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many bookings created, please try again after an hour.',
      retryAfter: '1 hour',
    },
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many bookings created, please try again after an hour.',
        retryAfter: '1 hour',
      },
    });
  },
});

// API-intensive endpointlar uchun (search, list)
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 daqiqa
  limit: 30, // Har bir IP uchun 1 daqiqada 30 ta so'rov
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many search requests, please slow down.',
      retryAfter: '1 minute',
    },
  },
});

// Admin paneli uchun
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  limit: 200, // Admin uchun ko'proq ruxsat
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
