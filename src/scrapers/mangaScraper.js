/**
 * Manga Scraper — mengambil data dari MyAnimeList
 * Halaman yang di-scrape:
 *   - /topmanga.php    → daftar top manga
 *   - /manga/:id       → detail manga
 */

const cheerio = require('cheerio');
const { fetchHTML, cleanText, parseNumber, extractIdFromUrl, buildMALUrl } = require('../utils/helpers');

// ─────────────────────────────────────────────────────────
// TOP MANGA
// URL: https://myanimelist.net/topmanga.php?type={type}&limit={offset}
// type: manga | novels | oneshots | doujin | manhwa | manhua
// ─────────────────────────────────────────────────────────
async function scrapeTopManga(type = 'manga', limit = 25, offset = 0) {
  const typeMap = {
    all: '',
    manga: 'manga',
    novels: 'novels',
    oneshots: 'oneshots',
    doujin: 'doujin',
    manhwa: 'manhwa',
    manhua: 'manhua',
  };

  const typeParam = typeMap[type] ?? 'manga';
  const url = `/topmanga.php?type=${typeParam}&limit=${offset}`;
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);

  const results = [];

  $('tr.ranking-list').each((i, el) => {
    if (results.length >= limit) return false;

    const $el = $(el);

    const rank = parseNumber($el.find('td.rank.ac span').text());

    // Cover image — MAL loads lazily via data-src
    const imgEl = $el.find('td.title.al img');
    const image =
      imgEl.attr('data-src') ||
      imgEl.attr('data-image') ||
      imgEl.attr('src') ||
      null;

    // Title anchor — beberapa versi MAL pakai h3 a, beberapa pakai a.hoverinfo_trigger
    const titleCell = $el.find('td.title.al');
    const titleAnchor =
      titleCell.find('h3 a').first().length
        ? titleCell.find('h3 a').first()
        : titleCell.find('.di-ib.clearfix a').first();

    const title = cleanText(titleAnchor.text());
    const malUrl = buildMALUrl(titleAnchor.attr('href'));
    const id = extractIdFromUrl(malUrl);

    // Info (type, volumes)
    const infoText = cleanText(titleCell.find('.information').text());
    const infoMatch = infoText ? infoText.match(/^(.+?)\s*\((\d+|\?)\s*(?:vols?|chs?)\)/) : null;
    const mangaType = infoMatch ? infoMatch[1].trim() : null;
    const volumes = infoMatch ? (infoMatch[2] === '?' ? null : parseInt(infoMatch[2])) : null;

    // Published dates
    const datesMatch = infoText ? infoText.match(/(\w{3} \d{4}|\?\?) - (\w{3} \d{4}|\?\?|now)/) : null;
    const publishedFrom = datesMatch ? datesMatch[1] : null;
    const publishedTo = datesMatch ? datesMatch[2] : null;

    const scoreText = cleanText($el.find('td.score.ac.fs14 span').text());
    const score = scoreText && scoreText !== 'N/A' ? parseNumber(scoreText) : null;

    const membersText = cleanText($el.find('td.members.ac span').text());
    const members = parseNumber(membersText ? membersText.replace(/,/g, '') : null);

    results.push({
      rank,
      id,
      title,
      image,
      type: mangaType,
      volumes,
      publishedFrom,
      publishedTo,
      score,
      members,
      malUrl,
    });
  });

  return results;
}

// ─────────────────────────────────────────────────────────
// MANGA DETAIL
// URL: https://myanimelist.net/manga/:id
// ─────────────────────────────────────────────────────────
async function scrapeMangaDetail(id) {
  const url = `/manga/${id}`;
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);

  const title = cleanText($('h1.title-name strong').text()) ||
                cleanText($('h1[itemprop="name"]').text());

  const image =
    $('img[itemprop="image"]').attr('data-src') ||
    $('img[itemprop="image"]').attr('src') ||
    null;

  const synopsis = cleanText($('p[itemprop="description"]').text()) || null;

  // Helper sidebar
  function getSidebarValue(label) {
    const el = $('.leftside .spaceit_pad').filter((_, el) => {
      return $(el).find('span.dark_text').text().trim().includes(label);
    });
    if (!el.length) return null;
    const clone = el.clone();
    clone.find('span.dark_text').remove();
    return cleanText(clone.text().replace(/\s+/g, ' ').trim()) || null;
  }

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

  const typeVal    = getSidebarValue('Type:');
  const volumes    = parseNumber(getSidebarValue('Volumes:'));
  const chapters   = parseNumber(getSidebarValue('Chapters:'));
  const status     = getSidebarValue('Status:');
  const published  = getSidebarValue('Published:');
  const serialization = getSidebarArray('Serialization:');
  const authors    = getSidebarArray('Authors:');
  const genres     = getSidebarArray('Genres:');
  const themes     = getSidebarArray('Themes:');
  const demographics = getSidebarArray('Demographics:');

  const score     = parseNumber($('div[itemprop="aggregateRating"] span[itemprop="ratingValue"]').text());
  const scoredBy  = parseNumber($('div[itemprop="aggregateRating"] span[itemprop="ratingCount"]').text());
  const ranked    = parseNumber($('.numbers.ranked strong').text().replace('#', ''));
  const popularity = parseNumber($('.numbers.popularity strong').text().replace('#', ''));
  const members   = parseNumber($('.numbers.members strong').text().replace(/,/g, ''));
  const favorites = parseNumber($('.numbers.favorites strong').text().replace(/,/g, ''));

  // Related manga
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

  return {
    id: parseInt(id),
    title,
    image,
    synopsis,
    type: typeVal,
    volumes,
    chapters,
    status,
    published,
    authors,
    serialization,
    genres,
    themes,
    demographics,
    score,
    scoredBy,
    ranked,
    popularity,
    members,
    favorites,
    related,
    malUrl: `https://myanimelist.net/manga/${id}`,
  };
}

module.exports = { scrapeTopManga, scrapeMangaDetail };
