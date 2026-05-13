# MAL Scraper REST API 🎌

REST API untuk scraping data dari [MyAnimeList](https://myanimelist.net/) menggunakan **Node.js**, **Express**, **Axios**, dan **Cheerio**.

> ⚠️ **Disclaimer**: Tool ini hanya untuk keperluan **pembelajaran/personal**. Harap hormati Terms of Service MyAnimeList dan jangan gunakan untuk keperluan komersial.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Jalankan Server
```bash
# Development (dengan auto-reload)
npm run dev

# Production
npm start
```

### 3. Akses API
```
http://localhost:3000
```

---

## 📋 Endpoint Reference

### 🏥 Health Check
```
GET /health
```
Mengecek status server dan statistik cache.

---

### 🎌 Anime

#### Daftar Top Anime
```
GET /api/anime/top
```
| Parameter | Type   | Default | Deskripsi |
|-----------|--------|---------|-----------|
| `type`    | string | `all`   | `all`, `airing`, `upcoming`, `tv`, `movie`, `ova`, `ona`, `special` |
| `limit`   | number | `25`    | Jumlah hasil (max 50) |
| `offset`  | number | `0`     | Paginasi (0, 25, 50, ...) |

**Contoh:**
```bash
curl http://localhost:3000/api/anime/top
curl http://localhost:3000/api/anime/top?type=airing&limit=10
curl http://localhost:3000/api/anime/top?type=movie&offset=25
```

#### Anime Musim Ini
```
GET /api/anime/seasonal
```
Mengambil daftar anime yang sedang tayang musim ini.

#### Detail Anime
```
GET /api/anime/:id
```
**Contoh:**
```bash
curl http://localhost:3000/api/anime/5114    # Fullmetal Alchemist: Brotherhood
curl http://localhost:3000/api/anime/1       # Cowboy Bebop
curl http://localhost:3000/api/anime/21      # One Piece
```

---

### 📚 Manga

#### Daftar Top Manga
```
GET /api/manga/top
```
| Parameter | Type   | Default | Deskripsi |
|-----------|--------|---------|-----------|
| `type`    | string | `all`   | `all`, `manga`, `novels`, `oneshots`, `doujin`, `manhwa`, `manhua` |
| `limit`   | number | `25`    | Jumlah hasil (max 50) |
| `offset`  | number | `0`     | Paginasi (0, 25, 50, ...) |

#### Detail Manga
```
GET /api/manga/:id
```
**Contoh:**
```bash
curl http://localhost:3000/api/manga/2     # Berserk
curl http://localhost:3000/api/manga/13    # One Piece Manga
```

---

### 🔍 Search

```
GET /api/search?q={keyword}
```
| Parameter | Type   | Default | Deskripsi |
|-----------|--------|---------|-----------|
| `q`       | string | -       | **Wajib**. Keyword pencarian (min 2 karakter) |
| `type`    | string | `anime` | `anime`, `manga`, `all` |
| `limit`   | number | `20`    | Jumlah hasil (max 50) |

**Contoh:**
```bash
curl "http://localhost:3000/api/search?q=naruto"
curl "http://localhost:3000/api/search?q=one+piece&type=manga&limit=5"
curl "http://localhost:3000/api/search?q=death+note&type=anime"
```

---

## 📦 Contoh Response

### Top Anime Response
```json
{
  "success": true,
  "meta": {
    "type": "all",
    "limit": 25,
    "offset": 0,
    "count": 25,
    "source": "https://myanimelist.net/topanime.php"
  },
  "data": [
    {
      "rank": 1,
      "id": 5114,
      "title": "Fullmetal Alchemist: Brotherhood",
      "image": "https://cdn.myanimelist.net/images/anime/1208/94745.jpg",
      "type": "TV",
      "episodes": 64,
      "score": 9.11,
      "members": 3500000,
      "malUrl": "https://myanimelist.net/anime/5114/Fullmetal_Alchemist__Brotherhood"
    }
  ]
}
```

### Anime Detail Response
```json
{
  "success": true,
  "meta": {
    "id": 5114,
    "source": "https://myanimelist.net/anime/5114"
  },
  "data": {
    "id": 5114,
    "title": "Fullmetal Alchemist: Brotherhood",
    "titleEnglish": "Fullmetal Alchemist: Brotherhood",
    "titleJapanese": "鋼の錬金術師 FULLMETAL ALCHEMIST",
    "image": "https://cdn.myanimelist.net/images/anime/...",
    "synopsis": "...",
    "type": "TV",
    "episodes": 64,
    "status": "Finished Airing",
    "aired": "Apr 5, 2009 to Jul 4, 2010",
    "score": 9.11,
    "ranked": 1,
    "genres": ["Action", "Adventure", "Drama", "Fantasy"],
    "studios": ["Bones"],
    ...
  }
}
```

---

## ⚙️ Konfigurasi (.env)

```env
PORT=3000
NODE_ENV=development

# Cache TTL (detik)
CACHE_TTL=900               # 15 menit default

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 menit
RATE_LIMIT_MAX=30           # 30 request/menit

# Delay antar scrape (ms)
SCRAPE_DELAY_MS=1000
```

---

## 🛡️ Fitur Keamanan

| Fitur | Detail |
|-------|--------|
| **Rate Limiting** | 30 req/menit per IP |
| **Caching** | In-memory cache (node-cache) |
| **Helmet** | Security HTTP headers |
| **CORS** | Cross-origin enabled |
| **Error Handling** | Consistent JSON error format |

### Cache TTL per Endpoint
| Endpoint | TTL |
|----------|-----|
| Top Anime/Manga | 10 menit |
| Seasonal | 30 menit |
| Detail | 1 jam |
| Search | 5 menit |

---

## 🗂️ Struktur Project

```
testing/
├── src/
│   ├── scrapers/
│   │   ├── animeScraper.js    # Scraper anime
│   │   ├── mangaScraper.js    # Scraper manga
│   │   └── searchScraper.js   # Scraper search
│   ├── routes/
│   │   ├── anime.js           # Route /api/anime/*
│   │   ├── manga.js           # Route /api/manga/*
│   │   └── search.js          # Route /api/search
│   ├── middleware/
│   │   ├── cache.js           # Caching middleware
│   │   └── rateLimiter.js     # Rate limiting
│   └── utils/
│       └── helpers.js         # Helper functions
├── server.js                  # Entry point
├── package.json
├── .env
└── README.md
```

---

## 📝 Development Endpoints (hanya NODE_ENV=development)

```bash
# Hapus semua cache
curl -X DELETE http://localhost:3000/api/cache

# Lihat statistik cache
curl http://localhost:3000/api/cache/stats
```

---

## 🤝 Alternatif Resmi

Untuk production/komersial, gunakan:
- **[Jikan API](https://jikan.moe/)** — Unofficial MAL REST API yang stabil dan gratis
- **[MAL Official API v2](https://myanimelist.net/apiconfig)** — API resmi MAL (perlu register)
