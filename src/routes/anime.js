/**
 * Anime Routes
 * Base: /api/anime
 */

const express = require('express');
const router = express.Router();
const { scrapeTopAnime, scrapeAnimeDetail, scrapeSeasonalAnime } = require('../scrapers/animeScraper');
const { cacheMiddleware } = require('../middleware/cache');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─────────────────────────────────────────────────────────
// GET /api/anime/top
// Query params:
//   type    = all | airing | upcoming | tv | movie | ova | ona | special (default: all)
//   limit   = 1-50 (default: 25)
//   offset  = 0, 25, 50, ... (default: 0)
// ─────────────────────────────────────────────────────────
router.get('/top', cacheMiddleware(600), async (req, res) => {
  try {
    const type   = req.query.type || 'all';
    const limit  = Math.min(parseInt(req.query.limit) || 25, 50);
    const offset = parseInt(req.query.offset) || 0;

    const validTypes = ['all', 'airing', 'upcoming', 'tv', 'movie', 'ova', 'ona', 'special'];
    if (!validTypes.includes(type)) {
      return res.status(400).json(
        errorResponse(`Type tidak valid. Pilihan: ${validTypes.join(', ')}`, 400)
      );
    }

    const data = await scrapeTopAnime(type, limit, offset);

    return res.json(
      successResponse(data, {
        meta: {
          type,
          limit,
          offset,
          count: data.length,
          source: 'https://myanimelist.net/topanime.php',
        },
      })
    );
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json(errorResponse(err.message, status));
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/anime/seasonal
// Mengambil anime musim yang sedang berjalan
// ─────────────────────────────────────────────────────────
router.get('/seasonal', cacheMiddleware(1800), async (req, res) => {
  try {
    const data = await scrapeSeasonalAnime();

    return res.json(
      successResponse(data.anime, {
        meta: {
          season: data.season,
          count: data.total,
          source: 'https://myanimelist.net/anime/season',
        },
      })
    );
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json(errorResponse(err.message, status));
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/anime/:id
// Mengambil detail lengkap sebuah anime berdasarkan ID MAL
// ─────────────────────────────────────────────────────────
router.get('/:id', cacheMiddleware(3600), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id || isNaN(id) || id <= 0) {
      return res.status(400).json(errorResponse('ID anime tidak valid. Harus berupa angka positif.', 400));
    }

    const data = await scrapeAnimeDetail(id);

    return res.json(
      successResponse(data, {
        meta: {
          id,
          source: `https://myanimelist.net/anime/${id}`,
        },
      })
    );
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json(errorResponse(err.message, status));
  }
});

module.exports = router;
