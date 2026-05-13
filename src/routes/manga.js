/**
 * Manga Routes
 * Base: /api/manga
 */

const express = require('express');
const router = express.Router();
const { scrapeTopManga, scrapeMangaDetail } = require('../scrapers/mangaScraper');
const { cacheMiddleware } = require('../middleware/cache');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─────────────────────────────────────────────────────────
// GET /api/manga/top
// Query params:
//   type   = all | manga | novels | oneshots | doujin | manhwa | manhua (default: all)
//   limit  = 1-50 (default: 25)
//   offset = 0, 25, 50, ... (default: 0)
// ─────────────────────────────────────────────────────────
router.get('/top', cacheMiddleware(600), async (req, res) => {
  try {
    const type   = req.query.type || 'all';
    const limit  = Math.min(parseInt(req.query.limit) || 25, 50);
    const offset = parseInt(req.query.offset) || 0;

    const validTypes = ['all', 'manga', 'novels', 'oneshots', 'doujin', 'manhwa', 'manhua'];
    if (!validTypes.includes(type)) {
      return res.status(400).json(
        errorResponse(`Type tidak valid. Pilihan: ${validTypes.join(', ')}`, 400)
      );
    }

    const data = await scrapeTopManga(type, limit, offset);

    return res.json(
      successResponse(data, {
        meta: {
          type,
          limit,
          offset,
          count: data.length,
          source: 'https://myanimelist.net/topmanga.php',
        },
      })
    );
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json(errorResponse(err.message, status));
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/manga/:id
// Mengambil detail lengkap sebuah manga berdasarkan ID MAL
// ─────────────────────────────────────────────────────────
router.get('/:id', cacheMiddleware(3600), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id) || id <= 0) {
      return res.status(400).json(errorResponse('ID manga tidak valid. Harus berupa angka positif.', 400));
    }

    const data = await scrapeMangaDetail(id);

    return res.json(
      successResponse(data, {
        meta: {
          id,
          source: `https://myanimelist.net/manga/${id}`,
        },
      })
    );
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json(errorResponse(err.message, status));
  }
});

module.exports = router;
