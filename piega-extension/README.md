# Piega Chrome Extension

Manifest V3 extension that extracts structured property data from Rightmove listing pages.

## Load in Chrome (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked** → select the `piega-extension/` folder
4. Navigate to any Rightmove listing, e.g.  
   `https://www.rightmove.co.uk/properties/12345678`
5. Open DevTools → **Console** — you will see:

```
[PIEGA] extracted: { listingId: "12345678", askingPrice: 450000, … }
```

6. Click the Piega toolbar icon to open the popup panel.

---

## File structure

```
piega-extension/
├── manifest.json       MV3 manifest — content script bound to /properties/*
├── content_script.js   DOM parser, injected at document_idle
├── background.js       Service worker, relays & caches data by tab
├── popup.html          Extension popup markup
└── popup.js            Popup data retrieval & rendering
```

---

## Extraction reliability

The content script tries four sources in priority order:

| Source | Reliability | Notes |
|--------|-------------|-------|
| **`__NEXT_DATA__`** | ✅ Very high | Rightmove runs on Next.js. This `<script>` tag is always present and contains the full server-side render props. Property data lives at `props.pageProps.propertyData`. All core fields come from here. |
| **Inline `<script>` vars** | ⚠️ Medium | Looks for `window.PAGE_MODEL = {…}` style assignments in `<script>` tag text (content scripts can't read JS globals from the page's isolated world, only the DOM). Regex-based JSON extraction may break if minification layout changes. |
| **`application/ld+json`** | ⚠️ Medium | schema.org markup — Rightmove does not always include it. Reliable for `geo` lat/lng and address when present. |
| **DOM scraping** | ❌ Fragile | Rightmove uses CSS-in-JS with hashed class names that change on every deploy. Only `data-testid` attributes and `og:` meta tags are stable. `propertyType`, `bathrooms`, `agent`, and `tenure` are never reliably available here. |

### Fields by reliability

| Field | Reliable source | Notes |
|-------|----------------|-------|
| `listingId` | ✅ URL | Always extractable from the URL path. |
| `askingPrice` | ✅ `__NEXT_DATA__` | Raw integer (GBP). |
| `latitude` / `longitude` | ✅ `__NEXT_DATA__` + meta fallback | `og:latitude` / `og:longitude` meta tags also present, used as fallback. |
| `postcode` | ✅ `__NEXT_DATA__` | Parsed from `location.postcode`; regex fallback on address string. |
| `propertyType` | ✅ `__NEXT_DATA__` | `propertySubType` (e.g. "Detached", "Flat"). |
| `bedrooms` | ✅ `__NEXT_DATA__` | Integer. |
| `bathrooms` | ✅ `__NEXT_DATA__` | Integer. |
| `description` | ✅ `__NEXT_DATA__` | Full text from `text.description`. |
| `agent` | ✅ `__NEXT_DATA__` | `customer.branchDisplayName`. |
| `tenure` | ✅ `__NEXT_DATA__` | `tenure.tenureType` (e.g. "Freehold"). |
| `addedOrReduced` | ⚠️ `__NEXT_DATA__` | `listingHistory.listingUpdateReason` — present on most but not all listings. |
| `imageCount` | ⚠️ `__NEXT_DATA__` | Length of the `images` array — may be `null` on some listing types. |

### Known fragile points

- **`__NEXT_DATA__` path** — Rightmove have historically reorganised the `pageProps` shape. If data returns `null` despite `__NEXT_DATA__` existing, inspect the raw JSON in DevTools (`document.getElementById('__NEXT_DATA__').textContent`) and update the path fallbacks in `fromNextData()`.
- **DOM class names** — change with every deploy. Never rely on them long-term.
- **Leasehold details, service charges, EPC ratings** — not yet extracted; available in `__NEXT_DATA__` once the shape is confirmed.

---

## Next steps

- [ ] Map `listingId` → Piega backend to cross-reference investment data
- [ ] Persist history per property in `chrome.storage.local`
- [ ] Add EPC rating, leasehold years remaining, council tax band
- [ ] Icon assets (`icons/icon16.png`, `icon48.png`, `icon128.png`)
