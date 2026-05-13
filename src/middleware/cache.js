/**
 * In-memory cache middleware menggunakan node-cache
 * TTL default: 15 menit (configurable via .env)
 */

const NodeCache = require('node-cache');

const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 900; // 15 menit

const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: 120, // cek expired key setiap 2 menit
  useClones: false,
});

// ──────────────────────────────────────────
// Middleware: cache GET requests
// Key berdasarkan full URL + query string
// ──────────────────────────────────────────
function cacheMiddleware(ttl = CACHE_TTL) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `__cache__${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached !== undefined) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', cache.getTtl(key));
      return res.json(cached);
    }

    // Intercept res.json untuk menyimpan ke cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Hanya cache response sukses
      if (res.statusCode === 200 && body && body.success) {
        cache.set(key, body, ttl);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// ──────────────────────────────────────────
// Hapus cache manual (untuk testing)
// ──────────────────────────────────────────
function clearCache(key) {
  if (key) {
    cache.del(key);
  } else {
    cache.flushAll();
  }
}

// ──────────────────────────────────────────
// Info cache stats
// ──────────────────────────────────────────
function getCacheStats() {
  return cache.getStats();
}

module.exports = { cacheMiddleware, clearCache, getCacheStats };
