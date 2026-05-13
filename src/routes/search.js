/**
 * Search Routes
 * Base: /api/search
 */

const express = require('express');
const router = express.Router();
const { scrapeSearch } = require('../scrapers/searchScraper');
const { cacheMiddleware } = require('../middleware/cache');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─────────────────────────────────────────────────────────
// GET /api/search
// Query params:
//   q     = keyword pencarian (required, min 2 karakter)
//   type  = anime | manga | all (default: anime)
//   limit = 1-50 (default: 20)
// ─────────────────────────────────────────────────────────
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    const query = req.query.q || req.query.query || '';
    const type  = req.query.type || 'anime';
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    if (!query || query.trim().length < 2) {
      return res.status(400).json(
        errorResponse('Parameter "q" wajib diisi dan minimal 2 karakter. Contoh: /api/search?q=naruto', 400)
      );
    }

    const validTypes = ['anime', 'manga', 'all'];
    if (!validTypes.includes(type)) {
      return res.status(400).json(
        errorResponse(`Type tidak valid. Pilihan: ${validTypes.join(', ')}`, 400)
      );
    }

    const data = await scrapeSearch(query.trim(), type, limit);

    return res.json(
      successResponse(data.results, {
        meta: {
          query: data.query,
          type: data.type,
          count: data.total,
          limit,
          source: `https://myanimelist.net/search/all?q=${encodeURIComponent(query)}&cat=${type}`,
        },
      })
    );
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json(errorResponse(err.message, status));
  }
});

module.exports = router;
