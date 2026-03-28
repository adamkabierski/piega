/**
 * piega-parser — popup.js
 *
 * Handles the Analyse button:
 *   1. Reads the last parsed listing from chrome.storage.local
 *   2. POSTs it to the piega-agents Express server (localhost:3001)
 *   3. Opens the debug page in the piega-app (localhost:3000)
 */

'use strict';

const AGENTS_URL = 'http://localhost:4711';
const APP_URL    = 'http://localhost:4712';
const STORAGE_KEY_LAST_REPORT = 'piega:lastReport';

// ── DOM refs ──────────────────────────────────────────────────────────────
const listingArea  = document.getElementById('listingArea');
const analyseBtn   = document.getElementById('analyseBtn');
const openLastBtn  = document.getElementById('openLastBtn');
const statusDot    = document.getElementById('statusDot');
const statusText   = document.getElementById('statusText');

// ── State ─────────────────────────────────────────────────────────────────
let currentListing = null;
let lastReportId   = null;

// ── Helpers ───────────────────────────────────────────────────────────────
function setStatus(type, text) {
  // type: 'idle' | 'loading' | 'ok' | 'error'
  statusDot.className = `status-dot dot-${type}`;
  statusText.textContent = text;
}

function formatPrice(p, currency) {
  if (!p) return null;
  const sym = currency === 'GBP' ? '£' : currency ?? '£';
  return `${sym}${Number(p).toLocaleString('en-GB')}`;
}

function renderListing(listing) {
  if (!listing) {
    listingArea.innerHTML = `
      <div class="no-listing">
        Visit a Rightmove property page — Piega will parse it automatically.
      </div>`;
    analyseBtn.disabled = true;
    return;
  }

  const price   = formatPrice(listing.askingPrice, listing.priceCurrency);
  const beds    = listing.bedrooms   ? `${listing.bedrooms} bed` : null;
  const baths   = listing.bathrooms  ? `${listing.bathrooms} bath` : null;
  const type    = listing.propertyType ?? null;
  const metaParts = [price, beds, baths, type].filter(Boolean);

  listingArea.innerHTML = `
    <div class="listing-card">
      <div class="listing-address">${listing.address ?? `Listing ${listing.listingId}`}</div>
      <div class="listing-meta">
        <span>${metaParts.join(' · ')}</span>
      </div>
    </div>`;

  analyseBtn.disabled = false;
}

function renderNoListing() {
  listingArea.innerHTML = `
    <div class="no-listing">
      Visit a Rightmove property page — Piega will parse it automatically.
    </div>`;
  analyseBtn.disabled = true;
}

// ── Init: load last parsed listing from storage ──────────────────────────
async function init() {
  // Check for last report ID (to show "Open Last Report" button)
  const stored = await chrome.storage.local.get([STORAGE_KEY_LAST_REPORT]);
  lastReportId = stored[STORAGE_KEY_LAST_REPORT] ?? null;
  if (lastReportId) {
    openLastBtn.style.display = 'block';
  }

  // Get last parsed listing
  const meta = (await chrome.storage.local.get('piega:last'))['piega:last'];
  if (!meta?.key) {
    renderNoListing();
    setStatus('idle', 'No listing parsed yet');
    return;
  }

  const listingStore = await chrome.storage.local.get(meta.key);
  currentListing = listingStore[meta.key] ?? null;

  if (!currentListing) {
    renderNoListing();
    setStatus('idle', 'No listing parsed yet');
    return;
  }

  const ago = currentListing._parsedAt
    ? getRelativeTime(new Date(currentListing._parsedAt))
    : null;

  renderListing(currentListing);
  setStatus('idle', ago ? `Parsed ${ago}` : 'Ready to analyse');
}

function getRelativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH} hour${diffH === 1 ? '' : 's'} ago`;
}

// ── Analyse button ────────────────────────────────────────────────────────
analyseBtn.addEventListener('click', async () => {
  if (!currentListing) return;

  analyseBtn.disabled = true;
  setStatus('loading', 'Sending to server…');

  try {
    const res = await fetch(`${AGENTS_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing: currentListing, purpose: 'live_in' }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Server error ${res.status}: ${body}`);
    }

    const data = await res.json();
    const reportId = data.id;

    // Persist last report ID so the "Open Last Report" button works
    await chrome.storage.local.set({ [STORAGE_KEY_LAST_REPORT]: reportId });
    lastReportId = reportId;
    openLastBtn.style.display = 'block';

    setStatus('ok', `Report started — opening…`);

    // Open pipeline hub
    await chrome.tabs.create({ url: `${APP_URL}/pipeline/${reportId}` });

    // Close popup after brief delay
    setTimeout(() => window.close(), 400);

  } catch (err) {
    console.error('[PIEGA-PARSER] Analyse error:', err);
    setStatus('error', err.message.length > 55 ? err.message.slice(0, 52) + '…' : err.message);
    analyseBtn.disabled = false;
  }
});

// ── Open Last Report button ───────────────────────────────────────────────
openLastBtn.addEventListener('click', async () => {
  if (!lastReportId) return;
  await chrome.tabs.create({ url: `${APP_URL}/pipeline/${lastReportId}` });
  window.close();
});

// ── Run ───────────────────────────────────────────────────────────────────
init().catch(console.error);
