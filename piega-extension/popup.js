/**
 * Piega — popup.js
 *
 * Data retrieval order:
 *  1. chrome.storage.local  — content script already ran, data persisted
 *  2. chrome.tabs.sendMessage — ask content script directly (same page session)
 *  3. Show "no data" state if both fail
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
 * UI helpers
 * ═══════════════════════════════════════════════════════════════ */

function showState(id) {
  ['state-loading', 'state-not-rightmove', 'state-no-data', 'panel']
    .forEach(s => {
      document.getElementById(s).style.display = (s === id) ? '' : 'none';
    });
}

function fmt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function renderData(data) {
  if (!data) { showState('state-no-data'); return; }

  // ── Source badge ──────────────────────────────────────────
  const badge = document.getElementById('source-badge');
  badge.textContent = `source: ${data._source}`;
  badge.style.display = 'inline-block';

  // ── Hero row ──────────────────────────────────────────────
  document.getElementById('hero-address').textContent =
    data.address ?? data.postcode ?? `Listing ${data.listingId}` ?? '—';

  const priceLine = document.getElementById('hero-price-line');
  const parts = [];
  if (data.askingPrice) {
    parts.push(`<span class="pill">£${data.askingPrice.toLocaleString()}</span>`);
  } else if (data.priceDisplay) {
    parts.push(`<span class="pill">${data.priceDisplay}</span>`);
  }
  if (data.bedrooms)     parts.push(`${data.bedrooms} bed`);
  if (data.bathrooms)    parts.push(`${data.bathrooms} bath`);
  if (data.propertyType) parts.push(data.propertyType);
  priceLine.innerHTML = parts.join('  •  ');

  // ── Data table ────────────────────────────────────────────
  const FIELDS = [
    ['Listing ID',    data.listingId],
    ['Postcode',      data.postcode],
    ['Latitude',      data.latitude  != null ? data.latitude.toFixed(6)  : null],
    ['Longitude',     data.longitude != null ? data.longitude.toFixed(6) : null],
    ['Price (£)',     data.askingPrice],
    ['Property type', data.propertyType],
    ['Bedrooms',      data.bedrooms],
    ['Bathrooms',     data.bathrooms],
    ['Tenure',        data.tenure],
    ['Agent',         data.agent],
    ['Added/Reduced', data.addedOrReduced],
    ['Images',        data.imageCount],
  ];

  const table = document.getElementById('data-table');
  table.innerHTML = FIELDS.map(([label, value]) => {
    const fmtVal = fmt(value);
    const cls    = fmtVal == null ? 'value null' : 'value';
    const display = fmtVal ?? '—';
    return `<div class="row">
      <span class="label">${label}</span>
      <span class="${cls}">${display}</span>
    </div>`;
  }).join('');

  showState('panel');

  // ── Copy JSON button ──────────────────────────────────────
  document.getElementById('btn-copy').addEventListener('click', () => {
    const btn = document.getElementById('btn-copy');
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      .then(() => {
        btn.textContent = '✓ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy JSON';
          btn.classList.remove('copied');
        }, 1800);
      })
      .catch(() => { btn.textContent = 'Failed'; });
  });
}

/* ═══════════════════════════════════════════════════════════════
 * Boot: get active tab → resolve data
 * ═══════════════════════════════════════════════════════════════ */

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url) { showState('state-not-rightmove'); return; }

  // Is this a Rightmove property page?
  const match = tab.url.match(/rightmove\.co\.uk\/properties\/(\d+)/);
  if (!match) { showState('state-not-rightmove'); return; }

  const listingId = match[1];
  const storageKey = `piega:${listingId}`;

  // ── Step 1: check persistent storage ─────────────────────
  chrome.storage.local.get(storageKey, (result) => {
    const cached = result[storageKey];
    if (cached) { renderData(cached); return; }

    // ── Step 2: ask the live content script ───────────────
    chrome.tabs.sendMessage(tab.id, { type: 'PIEGA_GET_DATA' }, (response) => {
      if (chrome.runtime.lastError || !response?.payload) {
        showState('state-no-data');
        return;
      }
      renderData(response.payload);
    });
  });
});
