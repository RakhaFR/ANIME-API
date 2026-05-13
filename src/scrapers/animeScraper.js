/**
 * Anime Scraper — mengambil data dari MyAnimeList
 * Halaman yang di-scrape:
 *   - /topanime.php        → daftar top anime
 *   - /anime/season        → anime musim ini
 *   - /anime/:id/:slug     → detail anime
 */

const cheerio = require('cheerio');
const { fetchHTML, cleanText, parseNumber, extractIdFromUrl, buildMALUrl, sleep } = require('../utils/helpers');

const DELAY = parseInt(process.env.SCRAPE_DELAY_MS) || 1000;

// ─────────────────────────────────────────────────────────
// TOP ANIME
// URL: https://myanimelist.net/topanime.php?type={type}&limit={offset}
// type: all | airing | upcoming | tv | movie | ova | ona | special | manga | novels
// ─────────────────────────────────────────────────────────
async function scrapeTopAnime(type = 'all', limit = 25, offset = 0) {
  const typeMap = {
    all: '',
    airing: 'airing',
    upcoming: 'upcoming',
    tv: 'tv',
    movie: 'movie',
    ova: 'ova',
    ona: 'ona',
    special: 'special',
  };

  const typeParam = typeMap[type] ?? '';
  const url = `/topanime.php?type=${typeParam}&limit=${offset}`;
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);

  const results = [];

  $('tr.ranking-list').each((i, el) => {
    if (results.length >= limit) return false; // break

    const $el = $(el);

    // Rank
    const rank = parseNumber($el.find('td.rank.ac span').text());

    // Cover image
    const imgEl = $el.find('td.title.al img');
    const image =
      imgEl.attr('data-src') ||
      imgEl.attr('data-image') ||
      imgEl.attr('src') ||
      null;

    // Title & URL — dual selector for different MAL HTML versions
    const titleCell = $el.find('td.title.al');
    const titleAnchor =
      titleCell.find('h3 a').first().length
        ? titleCell.find('h3 a').first()
        : titleCell.find('.di-ib.clearfix a').first();

    const title = cleanText(titleAnchor.text());
    const malUrl = buildMALUrl(titleAnchor.attr('href'));
    const id = extractIdFromUrl(malUrl);

    // Info (type, episodes) from .information text
    const infoText = cleanText(titleCell.find('.information').text());
    const infoMatch = infoText ? infoText.match(/^(.+?)\s*\((\d+|\?)\s*eps?\)/) : null;
    const animeType = infoMatch ? infoMatch[1].trim() : null;
    const episodes = infoMatch ? (infoMatch[2] === '?' ? null : parseInt(infoMatch[2])) : null;

    // Airing dates dari info
    const datesMatch = infoText ? infoText.match(/(\w{3} \d{4}|\?\?) - (\w{3} \d{4}|\?\?|now)/) : null;
    const airedFrom = datesMatch ? datesMatch[1] : null;
    const airedTo = datesMatch ? datesMatch[2] : null;

    // Score
    const scoreText = cleanText($el.find('td.score.ac.fs14 span').text());
    const score = scoreText && scoreText !== 'N/A' ? parseNumber(scoreText) : null;

    // Members
    const membersText = cleanText($el.find('td.members.ac span').text());
    const members = parseNumber(membersText ? membersText.replace(/,/g, '') : null);

    results.push({
      rank,
      id,
      title,
      image,
      type: animeType,
      episodes,
      airedFrom,
      airedTo,
      score,
      members,
      malUrl,
    });
  });

  return results;
}

// ─────────────────────────────────────────────────────────
// ANIME DETAIL
// URL: https://myanimelist.net/anime/:id
// ─────────────────────────────────────────────────────────
async function scrapeAnimeDetail(id) {
  const url = `/anime/${id}`;
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);

  // Cek apakah halaman ditemukan
  if ($('h1.page-title').text().includes('404')) {
    const err = new Error('Anime tidak ditemukan');
    err.status = 404;
    throw err;
  }

  // ── Judul ──
  const title = cleanText($('h1.title-name strong').text()) ||
                cleanText($('h1[itemprop="name"]').text());

  // ── Judul alternatif ──
  const titleEnglish = cleanText($('.js-alternative-titles [itemprop="alternateName"]').first().text()) || null;
  const titleJapanese = cleanText($('.js-alternative-titles').find('span:contains("Japanese:")').next().text()) || null;

  // ── Cover image ──
  const image =
    $('img[itemprop="image"]').attr('data-src') ||
    $('img[itemprop="image"]').attr('src') ||
    null;

  // ── Synopsis ──
  const synopsis = cleanText($('p[itemprop="description"]').text()) || null;

  // ── Helper untuk ambil info dari sidebar ──
  function getSidebarValue(label) {
    const el = $('.leftside .spaceit_pad').filter((_, el) => {
      return $(el).find('span.dark_text').text().trim().includes(label);
    });
    if (!el.length) return null;
    const clone = el.clone();
    clone.find('span.dark_text').remove();
    return cleanText(clone.text().replace(/\s+/g, ' ').trim()) || null;
  }

  // ── Helper untuk ambil array dari sidebar (genres, studios, dll) ──
  function getSidebarArray(label) {
    const el = $('.leftside .spaceit_pad').filter((_, el) => {
      return $(el).find('span.dark_text').text().trim().includes(label);
    });
    if (!el.length) return [];
    return el
      .find('a')
      .map((_, a) => cleanText($(a).text()))
      .get()
      .filter(Boolean);
  }

  const typeVal      = getSidebarValue('Type:');
  const episodes     = parseNumber(getSidebarValue('Episodes:'));
  const status       = getSidebarValue('Status:');
  const airedRaw     = getSidebarValue('Aired:');
  const premieredRaw = getSidebarValue('Premiered:');
  const sourceMat    = getSidebarValue('Source:');
  const duration     = getSidebarValue('Duration:');
  const rating       = getSidebarValue('Rating:');
  const studios      = getSidebarArray('Studios:');
  const producers    = getSidebarArray('Producers:');
  const licensors    = getSidebarArray('Licensors:');
  const genres       = getSidebarArray('Genres:');
  const themes       = getSidebarArray('Themes:');
  const demographics = getSidebarArray('Demographics:');

  // ── Statistik ──
  const score = parseNumber($('div[itemprop="aggregateRating"] span[itemprop="ratingValue"]').text());
  const scoredBy = parseNumber($('div[itemprop="aggregateRating"] span[itemprop="ratingCount"]').text());
  const ranked = parseNumber($('.numbers.ranked strong').text().replace('#', ''));
  const popularity = parseNumber($('.numbers.popularity strong').text().replace('#', ''));
  const members = parseNumber($('.numbers.members strong').text().replace(/,/g, ''));
  const favorites = parseNumber($('.numbers.favorites strong').text().replace(/,/g, ''));

  // ── Trailer ──
  const trailerEl = $('a.iframe.mt8');
  const trailerUrl = trailerEl.attr('href') || null;
  const trailerThumb = trailerEl.find('img').attr('data-src') || trailerEl.find('img').attr('src') || null;

  // ── Related anime ──
  const related = [];
  $('table.anime_detail_related_anime tr').each((_, row) => {
    const relType = cleanText($(row).find('td:first-child').text());
    $(row).find('td:last-child a').each((_, a) => {
      related.push({
        type: relType,
        title: cleanText($(a).text()),
        malUrl: buildMALUrl($(a).attr('href')),
        id: extractIdFromUrl($(a).attr('href')),
      });
    });
  });

  // ── Characters (top 10) ──
  const characters = [];
  $('.detail-characters-list .left-col .btn-anime-character-voice').each((i, el) => {
    if (i >= 10) return false;
    const $el = $(el);
    const charName = cleanText($el.find('.fs12 strong').first().text());
    const charImg = $el.find('img').first().attr('data-src') || $el.find('img').first().attr('src');
    const charRole = cleanText($el.find('.fs11').first().text());
    if (charName) {
      characters.push({ name: charName, role: charRole, image: charImg || null });
    }
  });

  return {
    id: parseInt(id),
    title,
    titleEnglish,
    titleJapanese,
    image,
    synopsis,
    type: typeVal,
    episodes,
    status,
    aired: airedRaw,
    premiered: premieredRaw,
    source: sourceMat,
    duration,
    rating,
    score,
    scoredBy,
    ranked,
    popularity,
    members,
    favorites,
    studios,
    producers,
    licensors,
    genres,
    themes,
    demographics,
    trailer: trailerUrl ? { url: trailerUrl, thumbnail: trailerThumb } : null,
    related,
    characters,
    malUrl: `https://myanimelist.net/anime/${id}`,
  };
}

// ─────────────────────────────────────────────────────────
// SEASONAL ANIME
// URL: https://myanimelist.net/anime/season
// ─────────────────────────────────────────────────────────
async function scrapeSeasonalAnime() {
  const html = await fetchHTML('/anime/season');
  const $ = cheerio.load(html);

  // Ambil season & year dari heading
  const seasonHeading = cleanText($('div.seasonal-anime-list-table div.anime-header h2').first().text()) ||
                        cleanText($('h1.h1_temporary_fix').text()) ||
                        'Current Season';

  const results = [];

  $('.seasonal-anime').each((_, el) => {
    const $el = $(el);

    const titleEl = $el.find('.title-text h2 a').first();
    const title = cleanText(titleEl.text());
    const malUrl = buildMALUrl(titleEl.attr('href'));
    const id = extractIdFromUrl(malUrl);

    const image = $el.find('.image img').attr('data-src') ||
                  $el.find('.image img').attr('src') ||
                  null;

    const score = parseNumber($el.find('.score').text());

    const type = cleanText($el.find('.info .remain-time').text()) || null;
    const episodes = parseNumber($el.find('.info .eps').text()) || null;

    const genres = [];
    $el.find('.genres-inner a').each((_, a) => {
      const g = cleanText($(a).text());
      if (g) genres.push(g);
    });

    const synopsis = cleanText($el.find('p.preline').text()) || null;

    const studio = cleanText($el.find('.producer a').first().text()) || null;

    if (title) {
      results.push({ id, title, image, score, type, episodes, genres, studio, synopsis, malUrl });
    }
  });

  return { season: seasonHeading, total: results.length, anime: results };
}

module.exports = { scrapeTopAnime, scrapeAnimeDetail, scrapeSeasonalAnime };
