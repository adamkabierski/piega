/**
 * Piega — popup.js
 * Fetches property data from storage/content-script, then calls the
 * backend /api/area-intelligence endpoint and renders all 4 cards + map.
 */

'use strict';

const BACKEND = 'http://localhost:4711/api/area-intelligence';

/* ═══════════════════════════════════════════════════════════════
 * UI helpers
 * ═══════════════════════════════════════════════════════════════ */
function showState(id) {
  ['state-loading', 'state-not-rightmove', 'state-no-data', 'panel']
    .forEach(s => { document.getElementById(s).style.display = s === id ? '' : 'none'; });
}

function setCardBody(id, html, isError) {
  const card = document.getElementById(id);
  card.querySelector('.card-body').innerHTML = html;
  if (isError) card.classList.add('error');
  else card.classList.remove('error');
}

/* ═══════════════════════════════════════════════════════════════
 * Card renderers
 * ═══════════════════════════════════════════════════════════════ */
function renderIMD(imd) {
  if (!imd || imd.error) {
    setCardBody('card-imd', `<span class="muted">${imd?.error ?? 'Data unavailable'}</span>`, true);
    return;
  }
  const d = imd.decile;
  const segs = Array.from({ length: 10 }, (_, i) => {
    let cls = '';
    if (i + 1 === d) cls = d <= 3 ? 'active-low' : d <= 6 ? 'active-mid' : 'active-high';
    return `<div class="decile-seg ${cls}"></div>`;
  }).join('');
  const label = d <= 3 ? 'More deprived' : d <= 6 ? 'Average' : 'Less deprived';
  setCardBody('card-imd', `
    <div><span class="big">${d} / 10</span>&nbsp; ${label}</div>
    <div class="decile-bar">${segs}</div>
    <div class="decile-label"><span>Most deprived</span><span>Least deprived</span></div>
    <div class="card-note">Rank ${imd.rank?.toLocaleString()} of ${imd.outOf?.toLocaleString()} LSOAs &middot; ${imd.lsoaName ?? ''}</div>
  `);
}

function renderFlood(flood) {
  if (!flood || flood.error) {
    setCardBody('card-flood', `<span class="muted">${flood?.error ?? 'Data unavailable'}</span>`, true);
    return;
  }
  const z = flood.zone;
  setCardBody('card-flood', `
    <div><span class="zone-badge zone-${z}">Zone ${z}</span>${flood.label}</div>
    <div class="card-note">${flood.note ?? ''}</div>
  `);
}

function renderCrime(crime) {
  if (!crime || crime.error) {
    setCardBody('card-crime', `<span class="muted">${crime?.error ?? 'Data unavailable'}</span>`, true);
    return;
  }
  if (!crime.total) {
    setCardBody('card-crime', `<span class="muted">No crime data for this location</span>`);
    return;
  }
  const cats = (crime.categories ?? []).map(c =>
    `<div class="crime-row"><span class="cat-name">${c.category}</span><span class="cat-count">${c.count}</span></div>`
  ).join('');
  setCardBody('card-crime', `
    <div><span class="big">${crime.total}</span> incidents &mdash; ${crime.month}</div>
    <div class="crime-cats">${cats}</div>
    <div class="card-note">${crime.note ?? ''}</div>
  `);
}

function renderBoundary(boundary) {
  if (!boundary || boundary.error) {
    setCardBody('card-boundary', `<span class="muted">${boundary?.error ?? 'Data unavailable'}</span>`, true);
    return;
  }
  if (!boundary.registered) {
    setCardBody('card-boundary', `<span class="muted">Boundary not registered at Land Registry</span>`);
    return;
  }
  const area = boundary.area_m2 ? `${boundary.area_m2.toLocaleString()} m&sup2;` : 'Area unknown';
  const title = boundary.titleNumber ? `Title: ${boundary.titleNumber}` : '';
  setCardBody('card-boundary', `
    <div><span class="big">${area}</span></div>
    ${title ? `<div class="card-note">${title}</div>` : ''}
    <div class="card-note">${boundary.note ?? ''}</div>
  `);
}

/* ═══════════════════════════════════════════════════════════════
 * Map (Leaflet)
 * ═══════════════════════════════════════════════════════════════ */
let leafletMap = null;

function initMap(lat, lng, boundaryGeojson) {
  // Remove previous instance if re-initialising (e.g. boundary loaded after hero)
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  const mapEl = document.getElementById('map');
  // Reset any leftover Leaflet state on the element
  mapEl._leaflet_id = null;

  // Use a small timeout to ensure the panel is fully painted before Leaflet
  // measures the container — requestAnimationFrame alone is not enough in
  // Chrome extension popups because the layout hasn't flushed yet.
  setTimeout(() => {
    leafletMap = L.map('map', {
      zoomControl:       true,
      attributionControl: false,
    }).setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(leafletMap);

    // Custom purple pin
    const pin = L.divIcon({
      html: '<div style="width:12px;height:12px;background:#7c3aed;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
      iconSize: [12, 12], iconAnchor: [6, 6], className: '',
    });
    L.marker([lat, lng], { icon: pin }).addTo(leafletMap);

    if (boundaryGeojson) {
      L.geoJSON(boundaryGeojson, {
        style: { color: '#7c3aed', weight: 2, fillColor: '#7c3aed', fillOpacity: 0.15 },
      }).addTo(leafletMap);
      document.getElementById('map-label').textContent = 'Property location + INSPIRE boundary';
    }

    // Force Leaflet to recalculate container size after render
    setTimeout(() => leafletMap && leafletMap.invalidateSize(), 150);
  }, 50);
}

/* ═══════════════════════════════════════════════════════════════
 * Hero renderer
 * ═══════════════════════════════════════════════════════════════ */
function renderPropertyHero(data) {
  document.getElementById('hero-address').textContent =
    data.address ?? data.postcode ?? `Listing ${data.listingId}` ?? '—';

  const pills = document.getElementById('hero-pills');
  const parts = [];
  if (data.askingPrice) parts.push(`\u00a3${data.askingPrice.toLocaleString()}`);
  else if (data.priceDisplay) parts.push(data.priceDisplay);
  if (data.bedrooms)     parts.push(`${data.bedrooms} bed`);
  if (data.propertyType) parts.push(data.propertyType);
  pills.innerHTML = parts.map(p => `<span class="pill">${p}</span>`).join('');

  const badge = document.getElementById('source-badge');
  if (data._source) { badge.textContent = data._source; badge.style.display = ''; }
}

/* ═══════════════════════════════════════════════════════════════
 * Backend fetch
 * ═══════════════════════════════════════════════════════════════ */
async function fetchIntelligence(data) {
  console.log('[PIEGA POPUP] Fetching area intelligence for',
    data.postcode, data.latitude, data.longitude);
  const res = await fetch(BACKEND, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      postcode:  data.postcode,
      latitude:  data.latitude,
      longitude: data.longitude,
    }),
  });
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return res.json();
}

/* ═══════════════════════════════════════════════════════════════
 * Boot
 * ═══════════════════════════════════════════════════════════════ */
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url) { showState('state-not-rightmove'); return; }

  const match = tab.url.match(/rightmove\.co\.uk\/properties\/(\d+)/);
  if (!match) { showState('state-not-rightmove'); return; }

  const listingId = match[1];

  chrome.storage.local.get(`piega:${listingId}`, async (result) => {
    let data = result[`piega:${listingId}`];

    if (!data) {
      data = await new Promise(resolve => {
        chrome.tabs.sendMessage(tab.id, { type: 'PIEGA_GET_DATA' }, r => {
          resolve(chrome.runtime.lastError ? null : r?.payload);
        });
      });
    }

    if (!data) { showState('state-no-data'); return; }

    console.log('[PIEGA POPUP] Property data:', data);
    renderPropertyHero(data);
    showState('panel');

    // Init map immediately with just the pin — no boundary yet
    if (data.latitude && data.longitude) {
      initMap(data.latitude, data.longitude, null);
    }

    try {
      const intel = await fetchIntelligence(data);
      console.log('[PIEGA POPUP] Area intelligence:', intel);

      renderIMD(intel.imd);
      renderFlood(intel.floodRisk);
      renderCrime(intel.crime);
      renderBoundary(intel.boundary);

      // Add boundary overlay to existing map (no full re-init)
      const boundary = intel.boundary?.geometry ?? null;
      if (data.latitude && data.longitude && boundary && leafletMap) {
        L.geoJSON(boundary, {
          style: { color: '#7c3aed', weight: 2, fillColor: '#7c3aed', fillOpacity: 0.15 },
        }).addTo(leafletMap);
        document.getElementById('map-label').textContent = 'Property location + INSPIRE boundary';
      }

      document.getElementById('btn-copy').addEventListener('click', () => {
        const btn = document.getElementById('btn-copy');
        navigator.clipboard
          .writeText(JSON.stringify({ property: data, intelligence: intel }, null, 2))
          .then(() => {
            btn.textContent = '\u2713 Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = 'Copy JSON'; btn.classList.remove('copied'); }, 1800);
          });
      });

    } catch (e) {
      console.error('[PIEGA POPUP] Backend error:', e);
      const errHtml = `<span class="muted">Backend unavailable \u2014 is the server running on :3001?</span>`;
      ['card-imd', 'card-flood', 'card-crime', 'card-boundary']
        .forEach(id => setCardBody(id, errHtml, true));
    } finally {
      document.getElementById('intel-spinner').style.display = 'none';
    }
  });
});
