# piega-parser

Silent Chrome Extension (MV3) that parses property listing data from portal pages and stores it locally. No UI, no network calls, no page modifications.

## Structure

```
piega-parser/
├── manifest.json          — MV3 manifest, one content_scripts entry per portal
├── background.js          — Minimal service worker (storage + messaging)
└── rightmove/
    └── content_script.js  — Rightmove property page parser
```

Future portals drop in as new folders:

```
zoopla/content_script.js
onthemarket/content_script.js
```

and a new entry in `manifest.json` `content_scripts` array.

## What it parses (Rightmove)

5 sources, tried in priority order:

| # | Source | Reliability | Notes |
|---|--------|-------------|-------|
| 1 | `__NEXT_DATA__` | ★★★★★ | Full property blob from Next.js SSR |
| 2 | Inline `<script>` vars | ★★★★ | Walks JSON + regex for lat/lng |
| 3 | `application/ld+json` | ★★★ | schema.org Residence / Place |
| 4 | DOM scraping | ★★ | `data-testid` selectors, og: meta |
| 5 | Map `<img>` URL | ★★★★ | Enrichment via MutationObserver |

## Canonical data shape

```js
{
  _source,        // which source won: '__NEXT_DATA__' | 'inlineScript' | 'ld+json' | 'DOM'
  _parsedAt,      // ISO timestamp
  portal,         // 'rightmove'
  listingId,      // numeric string from URL
  askingPrice,    // integer (pence-free) e.g. 325000
  priceCurrency,  // 'GBP'
  priceDisplay,   // raw string e.g. '£325,000'
  propertyType,   // 'Detached' | 'Semi-Detached' | etc.
  bedrooms,       // integer
  bathrooms,      // integer
  latitude,       // float
  longitude,      // float
  address,        // full address string
  postcode,       // normalised e.g. 'SW1A 2AA'
  description,    // full listing description text
  agent,          // branch display name
  tenure,         // 'Freehold' | 'Leasehold' | etc.
  addedOrReduced, // e.g. 'Added' | 'Reduced'
  imageCount,     // integer
}
```

## Storage

Data is persisted in `chrome.storage.local`:

| Key | Value |
|-----|-------|
| `piega:rightmove:<listingId>` | Full canonical object |
| `piega:last` | `{ key, portal, listingId }` of the most recent parse |

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this `piega-parser/` folder
4. Visit any Rightmove property page — check DevTools console for `[PIEGA-PARSER]` logs

## DevTools helpers

On any Rightmove property page, open the console and run:

```js
// See current parsed result
window.__piegaData

// Full diagnostic report (sources, map imgs, meta tags, etc.)
piegaDebug()

// Query storage from background (in Service Worker console)
chrome.storage.local.get(null, console.log)
```
