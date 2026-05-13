/**
 * Search Scraper — scrape hasil pencarian MAL
 * Menggunakan endpoint /anime.php?q= dan /manga.php?q= yang lebih stabil
 * daripada /search/all yang membutuhkan cookie consent
 */

const cheerio = require('cheerio');
const { fetchHTML, cleanText, parseNumber, extractIdFromUrl, buildMALUrl } = require('../utils/helpers');

// ─────────────────────────────────────────────────────────
// SEARCH
// type: anime | manga | all
// ─────────────────────────────────────────────────────────
async function scrapeSearch(query, type = 'anime', limit = 20) {
  if (!query || query.trim().length < 2) {
    const err = new Error('Query pencarian minimal 2 karakter');
    err.status = 400;
    throw err;
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const results = [];

  // Scrape anime results
  if (type === 'anime' || type === 'all') {
    const animeResults = await scrapeAnimeSearch(encodedQuery, limit);
    results.push(...animeResults);
  }

  // Scrape manga results
  if (type === 'manga' || type === 'all') {
    const mangaResults = await scrapeMangaSearch(encodedQuery, limit);
    results.push(...mangaResults);
  }

  return {
    query,
    type,
    total: results.length,
    results: results.slice(0, limit),
  };
}

// ─────────────────────────────────────────────────────────
// Anime search via /anime.php?q=
// ─────────────────────────────────────────────────────────
async function scrapeAnimeSearch(encodedQuery, limit) {
  const url = `/anime.php?q=${encodedQuery}&cat=anime`;
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const results = [];

  // MAL anime search menggunakan table dengan class "list"
  $('div.js-categories-seasonal table tr').each((i, el) => {
    if (i === 0) return; // skip header row
    if (results.length >= limit) return false;

    const $el = $(el);
    const cells = $el.find('td');
    if (cells.length < 3) return;

    // Cell 0: image
    const image = cells.eq(0).find('img').attr('data-src') ||
                  cells.eq(0).find('img').attr('src') || null;

    // Cell 1: title + info
    const titleAnchor = cells.eq(1).find('a').first();
    const title = cleanText(titleAnchor.text());
    const malUrl = buildMALUrl(titleAnchor.attr('href'));
    const id = extractIdFromUrl(malUrl);

    const synopsis = cleanText(cells.eq(1).find('.pt4').text()) || null;

    // Cell 2: type
    const animeType = cleanText(cells.eq(2).text()) || null;

    // Cell 3: episodes
    const episodesText = cleanText(cells.eq(3).text());
    const episodes = episodesText && episodesText !== '-' ? parseInt(episodesText) || null : null;

    // Cell 4: score
    const scoreText = cleanText(cells.eq(4).text());
    const score = scoreText && scoreText !== 'N/A' ? parseNumber(scoreText) : null;

    if (title) {
      results.push({
        id,
        title,
        image,
        type: animeType || 'anime',
        episodes,
        volumes: null,
        score,
        synopsis,
        malUrl,
        category: 'anime',
      });
    }
  });

  return results;
}

// ─────────────────────────────────────────────────────────
// Manga search via /manga.php?q=
// ─────────────────────────────────────────────────────────
async function scrapeMangaSearch(encodedQuery, limit) {
  const url = `/manga.php?q=${encodedQuery}&cat=manga`;
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const results = [];

  $('div.js-categories-seasonal table tr').each((i, el) => {
    if (i === 0) return;
    if (results.length >= limit) return false;

    const $el = $(el);
    const cells = $el.find('td');
    if (cells.length < 3) return;

    const image = cells.eq(0).find('img').attr('data-src') ||
                  cells.eq(0).find('img').attr('src') || null;

    const titleAnchor = cells.eq(1).find('a').first();
    const title = cleanText(titleAnchor.text());
    const malUrl = buildMALUrl(titleAnchor.attr('href'));
    const id = extractIdFromUrl(malUrl);

    const synopsis = cleanText(cells.eq(1).find('.pt4').text()) || null;
    const mangaType = cleanText(cells.eq(2).text()) || null;

    const volumesText = cleanText(cells.eq(3).text());
    const volumes = volumesText && volumesText !== '-' ? parseInt(volumesText) || null : null;

    const chaptersText = cleanText(cells.eq(4).text());
    const chapters = chaptersText && chaptersText !== '-' ? parseInt(chaptersText) || null : null;

    const scoreText = cleanText(cells.eq(5).text());
    const score = scoreText && scoreText !== 'N/A' ? parseNumber(scoreText) : null;

    if (title) {
      results.push({
        id,
        title,
        image,
        type: mangaType || 'manga',
        episodes: null,
        volumes,
        chapters,
        score,
        synopsis,
        malUrl,
        category: 'manga',
      });
    }
  });

  return results;
}

module.exports = { scrapeSearch };
