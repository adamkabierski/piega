# Piega Chrome Extension — Area Intelligence Status
### March 19, 2026

---

## What it does, in plain terms

When a user visits a Rightmove property listing, a small Chrome extension icon appears in the browser toolbar. Clicking it opens a popup panel that shows two things:

1. **Property details** extracted directly from the page — address, asking price, number of bedrooms, property type.
2. **Area intelligence** — four data cards about the location, fetched in the background from real government data sources.

---

## The four area intelligence cards

| Card | What it shows | Source |
|---|---|---|
| **Deprivation (IMD)** | How deprived the local area is on a 1–10 scale (1 = most deprived, 10 = least). Shown as a colour-coded bar. | DLUHC England IMD 2019 |
| **Flood Risk** | Whether the property sits in Flood Zone 1 (low), 2 (medium) or 3 (high) | Environment Agency |
| **Crime** | Total recorded incidents near the postcode in the last available month, broken down by type | Police UK |
| **Plot / Boundary** | The registered land boundary polygon for the title, plus approximate plot area in m² | HM Land Registry INSPIRE |

---

## The map

Below the cards, a small interactive map shows:
- A **purple pin** at the exact property coordinates
- The **registered land boundary polygon** overlaid in purple (when available from Land Registry)

The map uses OpenStreetMap tiles.

---

## How the data flows

```
User opens Rightmove listing
        │
        ▼
Chrome extension reads the page
(lat/lng, address, price, bedrooms)
        │
        ▼
User clicks the Piega icon
        │
        ▼
Popup opens → shows property details immediately
        │
        ▼
Popup calls the local backend server (running on the same machine)
        │
        ├──▶ Postcode → LSOA lookup (postcodes.io)
        │         └──▶ LSOA → IMD score (bundled CSV, instant)
        │
        ├──▶ Lat/lng → Flood zone check (EA ArcGIS)
        │
        ├──▶ Lat/lng → Crime data (Police UK API)
        │
        └──▶ Lat/lng → Land boundary polygon (HMLR INSPIRE WFS)
                │
                ▼
        All four results returned together
                │
                ▼
        Cards populate + boundary drawn on map
```

---

## Current state

| Component | Status |
|---|---|
| Property data extraction from Rightmove | ✅ Working |
| IMD deprivation card | ✅ Working |
| Flood risk card | ✅ Working |
| Crime card | ✅ Working (rural areas return 0 — expected) |
| Boundary card | ⏳ Intermittent — HMLR's third-party WFS server has been returning 503 (temporary outage). The code and endpoint are correct; when the server is up it works. |
| Interactive map | ✅ Working (Leaflet bundled locally — was broken before due to Chrome's CDN block) |

---

## What's needed to run it

- Chrome with the extension loaded from the `piega-extension/` folder
- A local Node.js server running from `piega-backend/` (`node server.js`)
- The IMD CSV downloaded once (`node setup-data.mjs`) — ~9.7 MB, not in git

No API keys required. All data sources are free and public.
