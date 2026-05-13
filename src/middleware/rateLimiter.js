/**
 * Rate limiter middleware menggunakan express-rate-limit
 * Mencegah abuse dan melindungi MAL dari terlalu banyak request
 */

const rateLimit = require('express-rate-limit');

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 menit
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX) || 30; // 30 req/menit

const limiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,     // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      status: 429,
      message: `Terlalu banyak request. Maksimal ${MAX_REQUESTS} request per menit. Coba lagi nanti.`,
    },
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = limiter;
