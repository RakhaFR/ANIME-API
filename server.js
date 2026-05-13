/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║           MAL Scraper REST API — server.js                ║
 * ║   MyAnimeList Web Scraper built with Express + Cheerio    ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');

const limiter   = require('./src/middleware/rateLimiter');
const { getCacheStats, clearCache } = require('./src/middleware/cache');
const { errorResponse } = require('./src/utils/helpers');

// Routes
const animeRoutes  = require('./src/routes/anime');
const mangaRoutes  = require('./src/routes/manga');
const searchRoutes = require('./src/routes/search');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────
// GLOBAL MIDDLEWARE
// ─────────────────────────────────────────────────────────
app.use(helmet());                          // Security headers
app.use(cors());                            // Allow semua origin
app.use(morgan('dev'));                      // Request logger
app.use(express.json());                    // Parse JSON body
app.use(limiter);                           // Global rate limiter

// ─────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'MAL Scraper REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    cache: getCacheStats(),
  });
});

// ─────────────────────────────────────────────────────────
// STATIC FILES & ROOT
// ─────────────────────────────────────────────────────────
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────
app.use('/api/anime',  animeRoutes);
app.use('/api/manga',  mangaRoutes);
app.use('/api/search', searchRoutes);

// ─────────────────────────────────────────────────────────
// CACHE MANAGEMENT (hanya untuk dev)
// ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.delete('/api/cache', (req, res) => {
    clearCache();
    res.json({ success: true, message: 'Cache berhasil dibersihkan' });
  });

  app.get('/api/cache/stats', (req, res) => {
    res.json({ success: true, data: getCacheStats() });
  });
}

// ─────────────────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json(
    errorResponse(
      `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}. Cek GET / untuk daftar endpoint.`,
      404
    )
  );
});

// ─────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  const status = err.status || 500;
  res.status(status).json(errorResponse(err.message || 'Internal Server Error', status));
});

// ─────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║        MAL Scraper REST API — Running         ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log(`║  🚀 Server   : http://localhost:${PORT}           ║`);
  console.log(`║  📄 Docs     : http://localhost:${PORT}/           ║`);
  console.log(`║  💚 Health   : http://localhost:${PORT}/health      ║`);
  console.log(`║  🎌 Anime    : http://localhost:${PORT}/api/anime   ║`);
  console.log(`║  📚 Manga    : http://localhost:${PORT}/api/manga   ║`);
  console.log(`║  🔍 Search   : http://localhost:${PORT}/api/search  ║`);
  console.log(`║  🌍 Env      : ${(process.env.NODE_ENV || 'development').padEnd(31)}║`);
  console.log('╚═══════════════════════════════════════════════╝\n');
});

module.exports = app;
