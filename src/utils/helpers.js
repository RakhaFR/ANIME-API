/**
 * Helper utilities untuk MAL Scraper
 */

const axios = require('axios');

// ──────────────────────────────────────────
// Browser-like headers untuk menghindari block
// ──────────────────────────────────────────
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
    'image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
};

// ──────────────────────────────────────────
// Axios instance dengan config default
// ──────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: 'https://myanimelist.net',
  timeout: 15000,
  headers: DEFAULT_HEADERS,
});

// ──────────────────────────────────────────
// Fetch HTML dari URL
// ──────────────────────────────────────────
async function fetchHTML(url) {
  try {
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        throw createError(404, 'Halaman tidak ditemukan di MAL');
      } else if (status === 429) {
        throw createError(429, 'Terlalu banyak request ke MAL. Coba lagi nanti.');
      } else if (status === 403) {
        throw createError(403, 'Akses ditolak oleh MAL');
      }
      throw createError(status, `MAL mengembalikan error: ${status}`);
    }
    if (error.code === 'ECONNABORTED') {
      throw createError(504, 'Request ke MAL timeout');
    }
    throw createError(500, `Gagal mengambil data: ${error.message}`);
  }
}

// ──────────────────────────────────────────
// Delay helper untuk rate limiting antar request
// ──────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────
// Buat error object terformat
// ──────────────────────────────────────────
function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ──────────────────────────────────────────
// Bersihkan teks (trim whitespace berlebih)
// ──────────────────────────────────────────
function cleanText(text) {
  return text ? text.trim().replace(/\s+/g, ' ') : null;
}

// ──────────────────────────────────────────
// Parse angka dari string (score, episodes, dll)
// ──────────────────────────────────────────
function parseNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ──────────────────────────────────────────
// Ekstrak ID dari URL MAL
// Contoh: /anime/1/Cowboy_Bebop → 1
// ──────────────────────────────────────────
function extractIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/(anime|manga)\/(\d+)/);
  return match ? parseInt(match[2]) : null;
}

// ──────────────────────────────────────────
// Build URL MAL lengkap dari path relatif
// ──────────────────────────────────────────
function buildMALUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://myanimelist.net${path}`;
}

// ──────────────────────────────────────────
// Format response sukses
// ──────────────────────────────────────────
function successResponse(data, meta = {}) {
  return {
    success: true,
    ...meta,
    data,
  };
}

// ──────────────────────────────────────────
// Format response error
// ──────────────────────────────────────────
function errorResponse(message, status = 500) {
  return {
    success: false,
    error: {
      status,
      message,
    },
  };
}

module.exports = {
  fetchHTML,
  sleep,
  createError,
  cleanText,
  parseNumber,
  extractIdFromUrl,
  buildMALUrl,
  successResponse,
  errorResponse,
};
