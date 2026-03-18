/**
 * Piega — content_script.js
 * Injected into every Rightmove property page matching:
 *   *://*.rightmove.co.uk/properties/*
 *
 * Extraction priority:
 *   1. __NEXT_DATA__   (Rightmove is a Next.js app — most reliable)
 *   2. Inline <script> vars  (PAGE_MODEL or similar globals set as text)
 *   3. <script type="application/ld+json">  (schema.org structured data)
 *   4. DOM scraping    (last resort — most fragile)
 *
 * Does NOT modify the page in any way.
 */

(function piega() {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
   * SHARED HELPERS
   * ═══════════════════════════════════════════════════════════ */

  /** Pull the numeric listing ID straight from the URL path. */
  function extractIdFromUrl() {
    const m = location.pathname.match(/\/properties\/(\d+)/);
    return m ? m[1] : null;
  }

  /** Find a UK postcode anywhere inside a string. */
  function extractPostcode(str) {
    if (!str) return null;
    const m = str.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
    return m ? m[1].toUpperCase().replace(/\s+/, ' ') : null;
  }

  /** Strip £ / commas and return an integer, or null on failure. */
  function parsePrice(str) {
    if (!str) return null;
    const n = parseInt(str.replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  /**
   * Recursively search an object for the first sub-object that has both
   * `latitude` and `longitude` as numbers (handles any nesting depth).
   */
  function deepFindLatLng(obj, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 10 || !obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
      return { latitude: obj.latitude, longitude: obj.longitude };
    }
    for (const val of Object.values(obj)) {
      const found = deepFindLatLng(val, depth + 1);
      if (found) return found;
    }
    return null;
  }

  /**
   * Normalise a raw property-data blob (pd) into our canonical shape.
   * Works for both __NEXT_DATA__ pageProps.propertyData and PAGE_MODEL.propertyData
   * because Rightmove uses the same schema in both places.
   */
  function normalise(pd, source) {
    return {
      _source:       source,
      listingId:     pd.id          ?? extractIdFromUrl(),
      askingPrice:   pd.price?.amount ?? null,
      priceCurrency: pd.price?.currencyCode ?? 'GBP',
      priceDisplay:  pd.price?.displayPrices?.[0]?.displayPrice ?? null,
      propertyType:  pd.propertySubType ?? pd.propertyType ?? null,
      bedrooms:      pd.bedrooms   ?? null,
      bathrooms:     pd.bathrooms  ?? null,
      latitude:      pd.location?.latitude  ?? null,
      longitude:     pd.location?.longitude ?? null,
      address:       pd.location?.address   ?? pd.address?.displayAddress ?? null,
      postcode:      extractPostcode(
                       pd.location?.postcode  ??
                       pd.location?.address   ??
                       pd.address?.postcode   ?? ''
                     ),
      description:   pd.text?.description ?? pd.description ?? null,
      agent:         pd.customer?.branchDisplayName ?? null,
      tenure:        pd.tenure?.tenureType ?? null,
      addedOrReduced: pd.listingHistory?.listingUpdateReason ?? null,
      imageCount:    Array.isArray(pd.images) ? pd.images.length : null,
    };
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 1 — __NEXT_DATA__  ★ most reliable ★
   *
   * Rightmove is a Next.js application.  On every page load,
   * Next.js serialises server-side props into:
   *   <script id="__NEXT_DATA__" type="application/json">…</script>
   *
   * The property payload sits at:
   *   props.pageProps.propertyData   (primary)
   *   props.pageProps.property       (secondary)
   *   props.pageProps.pageData.propertyData  (tertiary)
   * ═══════════════════════════════════════════════════════════ */

  function fromNextData() {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return null; // logged by the auto-dump instead

    let nd;
    try { nd = JSON.parse(el.textContent); } catch (e) {
      console.warn('[PIEGA] __NEXT_DATA__ parse error:', e);
      return null;
    }

    const pp = nd?.props?.pageProps;
    if (!pp) {
      console.warn('[PIEGA] __NEXT_DATA__ has no props.pageProps. Full object:', nd);
      return null;
    }

    console.log('[PIEGA] __NEXT_DATA__ pageProps keys:', Object.keys(pp));

    const pd =
      pp.propertyData           ??
      pp.property               ??
      pp.listing                ??
      pp.pageData?.propertyData ??
      null;

    if (!pd) {
      console.warn('[PIEGA] Could not find propertyData in pageProps:', pp);
      return null;
    }

    const result = normalise(pd, '__NEXT_DATA__');

    if (!result.latitude || !result.longitude) {
      const found = deepFindLatLng(pd) || deepFindLatLng(nd);
      if (found) {
        result.latitude  = found.latitude;
        result.longitude = found.longitude;
        result._latLngSource = 'deepScan';
      }
    }

    return result;
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 2 — Inline <script> variable assignments
   *
   * Rightmove sometimes writes a server-rendered PAGE_MODEL or
   * similar variable into an inline <script> tag:
   *   <script>window.PAGE_MODEL = {"propertyData":{…}};</script>
   *
   * Because content scripts run in an isolated JS world, they
   * cannot read window.PAGE_MODEL directly — but they CAN read
   * the raw text of <script> nodes from the DOM and parse it.
   *
   * ⚠ FRAGILE: depends on the exact serialisation format.
   * ═══════════════════════════════════════════════════════════ */

  function fromInlineScripts() {
    // Scan ALL inline script tags (no type filter — cast the widest net)
    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of scripts) {
      const text = script.textContent;
      if (!text) continue;

      // Strategy A: find any JSON object literal that contains a lat/lng pair
      if (/latit|longit/i.test(text)) {
        // Walk every `{` in the script and try to parse outward
        let pos = 0;
        while ((pos = text.indexOf('{', pos)) !== -1) {
          // Find the matching closing brace heuristically (try growing slices)
          for (let end = pos + 2; end <= text.length; end++) {
            if (text[end - 1] !== '}') continue;
            try {
              const candidate = text.slice(pos, end);
              const obj = JSON.parse(candidate);
              const ll = deepFindLatLng(obj);
              if (ll) {
                console.log('[PIEGA] lat/lng found in inline script at char', pos, ':', ll);
                // Also look for propertyData nearby
                const pd = obj?.propertyData ?? obj?.property ?? obj?.listing ?? null;
                if (pd) return normalise(pd, 'inlineScript');
                // Return a partial result with just lat/lng so enrichment can use it
                return {
                  _source: 'inlineScript',
                  listingId: extractIdFromUrl(),
                  askingPrice: null, priceCurrency: 'GBP', priceDisplay: null,
                  propertyType: null, bedrooms: null, bathrooms: null,
                  latitude: ll.latitude, longitude: ll.longitude,
                  address: null, postcode: null, description: null,
                  agent: null, tenure: null, addedOrReduced: null, imageCount: null,
                };
              }
            } catch (_) {}
          }
          pos++;
        }
      }

      // Strategy B: look for key=value or key:value assignments (non-JSON)
      const latMatch = text.match(/["']?latitude["']?\s*[:=]\s*([\-\d.]+)/);
      const lngMatch = text.match(/["']?longitude["']?\s*[:=]\s*([\-\d.]+)/);
      if (latMatch && lngMatch) {
        const lat = parseFloat(latMatch[1]);
        const lng = parseFloat(lngMatch[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('[PIEGA] lat/lng found via regex in inline script:', lat, lng);
          return {
            _source: 'inlineScriptRegex',
            listingId: extractIdFromUrl(),
            askingPrice: null, priceCurrency: 'GBP', priceDisplay: null,
            propertyType: null, bedrooms: null, bathrooms: null,
            latitude: lat, longitude: lng,
            address: null, postcode: null, description: null,
            agent: null, tenure: null, addedOrReduced: null, imageCount: null,
          };
        }
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 3 — application/ld+json  (schema.org)
   *
   * Some listing pages include a JSON-LD block with Residence or
   * Place markup.  Less complete than the above but provides
   * reliable lat/lng, address, and description.
   * ═══════════════════════════════════════════════════════════ */

  function fromSchemaOrg() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      let items;
      try {
        const obj = JSON.parse(script.textContent);
        items = Array.isArray(obj) ? obj : [obj];
      } catch (_) { continue; }

      for (const item of items) {
        const t = item['@type'] ?? '';
        if (!['Residence', 'Place', 'Product', 'RealEstateListing'].some(k => t.includes(k))) continue;

        return {
          _source:       'ld+json',
          listingId:     extractIdFromUrl(),
          askingPrice:   item.offers?.price ? Number(item.offers.price) : null,
          priceCurrency: item.offers?.priceCurrency ?? 'GBP',
          priceDisplay:  null,
          propertyType:  t ?? null,
          bedrooms:      item.numberOfRooms ?? item.numberOfBedrooms ?? null,
          bathrooms:     item.numberOfBathroomsTotal ?? null,
          latitude:      item.geo?.latitude  ? parseFloat(item.geo.latitude)  : null,
          longitude:     item.geo?.longitude ? parseFloat(item.geo.longitude) : null,
          address:       item.address?.streetAddress ?? null,
          postcode:      item.address?.postalCode     ?? null,
          description:   item.description ?? null,
          agent:         null,
          tenure:        null,
          addedOrReduced: null,
          imageCount:    null,
        };
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 4 — DOM scraping  ⚠ most fragile ⚠
   *
   * Rightmove uses hashed / generated CSS class names (CSS-in-JS)
   * that change on every deploy.  Prefer data-testid attributes
   * and semantic selectors where possible.  meta og: tags for
   * lat/lng are the most stable DOM-based approach.
   * ═══════════════════════════════════════════════════════════ */

  function fromDOM() {
    /** Try a list of selectors in order, return first non-empty text. */
    const text = (...selectors) => {
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          const t = el?.textContent?.trim();
          if (t) return t;
        } catch (_) {}
      }
      return null;
    };

    /** Read a <meta> content attribute. */
    const meta = (prop) =>
      document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)
              ?.getAttribute('content') ?? null;

    const rawPrice = text(
      '[data-testid="price"]',
      '.propertyHeaderPrice',
      'p[class*="price" i]',
      'div[class*="Price"] p',
    );

    const rawAddress = text(
      'h1[itemprop="streetAddress"]',
      'address[data-testid="address-wrapper"]',
      'h1[class*="address" i]',
      'h1',                           // broadest fallback
    );

    const rawDescription = text(
      '[data-testid="description"]',
      'div[class*="description" i]',
      'div[itemprop="description"]',
    );

    const bedroomsRaw = text(
      '[data-testid="beds-label"]',
      '[data-testid="svg-bed"] + *',
      'span[class*="bedroom" i]',
      'li[class*="bed" i]',
    );

    return {
      _source:       'DOM',
      listingId:     extractIdFromUrl(),
      askingPrice:   parsePrice(rawPrice),
      priceCurrency: 'GBP',
      priceDisplay:  rawPrice,
      propertyType:  null,    // no stable selector
      bedrooms:      bedroomsRaw
                       ? (parseInt(bedroomsRaw.match(/\d+/)?.[0], 10) || null)
                       : null,
      bathrooms:     null,
      latitude:      meta('og:latitude')  ? parseFloat(meta('og:latitude'))  : null,
      longitude:     meta('og:longitude') ? parseFloat(meta('og:longitude')) : null,
      address:       rawAddress,
      postcode:      extractPostcode(rawAddress),
      description:   rawDescription,
      agent:         null,
      tenure:        null,
      addedOrReduced: null,
      imageCount:    null,
    };
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 5 — Rightmove map <img> URL  ★ reliable lat/lng ★
   *
   * The map thumbnail always uses:
   *   https://media.rightmove.co.uk/map/_generate?…&latitude=XX&longitude=YY&…
   * The <h2 id="mapTitleScrollAnchor"> contains the full address + postcode.
   * Both are stable selectors (real id / CDN URL pattern).
   * Used as enrichment only — not a standalone source.
   * ═══════════════════════════════════════════════════════════ */

  /** Read lat/lng + address from map DOM elements (sync — call after DOM is ready). */
  function readMapElements() {
    const result = {};

    // ── lat/lng from map image URL ──────────────────────────
    const mapImg = document.querySelector(
      'img[src*="rightmove.co.uk/map/_generate"], img[src*="/map/_generate"]'
    );
    if (mapImg) {
      try {
        const url = new URL(mapImg.getAttribute('src'), location.href);
        const lat = url.searchParams.get('latitude');
        const lng = url.searchParams.get('longitude');
        if (lat) result.latitude  = parseFloat(lat);
        if (lng) result.longitude = parseFloat(lng);
        console.log('[PIEGA] map img found, lat/lng:', result.latitude, result.longitude);
      } catch (e) {
        console.warn('[PIEGA] map img URL parse error:', e);
      }
    } else {
      console.log('[PIEGA] map img not in DOM yet');
    }

    // ── address + postcode from the map title heading ───────
    const heading = document.getElementById('mapTitleScrollAnchor');
    if (heading) {
      const t = heading.textContent?.trim();
      if (t) {
        result.address  = t;
        result.postcode = extractPostcode(t);
      }
    }

    return (result.latitude || result.address) ? result : null;
  }

  /**
   * Wait up to `timeoutMs` for the map image to appear via MutationObserver,
   * then resolve with the extracted data (or null on timeout).
   */
  function waitForMapElements(timeoutMs) {
    if (timeoutMs === undefined) timeoutMs = 6000;
    return new Promise((resolve) => {
      // Already there?
      const immediate = readMapElements();
      if (immediate && immediate.latitude) { resolve(immediate); return; }

      const observer = new MutationObserver(() => {
        const data = readMapElements();
        if (data && data.latitude) {
          observer.disconnect();
          clearTimeout(timer);
          console.log('[PIEGA] map img appeared in DOM after hydration');
          resolve(data);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

      const timer = setTimeout(() => {
        observer.disconnect();
        console.warn('[PIEGA] map img never appeared within', timeoutMs, 'ms');
        // Still try one last time in case heading appeared without img
        resolve(readMapElements());
      }, timeoutMs);
    });
  }

  /* ═══════════════════════════════════════════════════════════
   * MAIN — run all sources in priority order
   * ═══════════════════════════════════════════════════════════ */

  async function extractPropertyData() {
    const result =
      fromNextData()      ||
      fromInlineScripts() ||
      fromSchemaOrg()     ||
      fromDOM();

    if (!result) return null;

    // Enrich: lat/lng + address — wait for React to render the map section
    if (!result.latitude || !result.longitude || !result.address) {
      const mapData = await waitForMapElements(6000);
      if (mapData) {
        if (!result.latitude  && mapData.latitude)  result.latitude  = mapData.latitude;
        if (!result.longitude && mapData.longitude) result.longitude = mapData.longitude;
        if (!result.address   && mapData.address)   result.address   = mapData.address;
        if (!result.postcode  && mapData.postcode)  result.postcode  = mapData.postcode;
      }
    }

    // Enrich: fill in missing lat/lng from og: meta tags if still null
    if (!result.latitude || !result.longitude) {
      const lat = document.querySelector('meta[property="og:latitude"]')?.getAttribute('content');
      const lng = document.querySelector('meta[property="og:longitude"]')?.getAttribute('content');
      if (lat) result.latitude  = parseFloat(lat);
      if (lng) result.longitude = parseFloat(lng);
    }

    // Enrich: postcode from address string if not found directly
    if (!result.postcode && result.address) {
      result.postcode = extractPostcode(result.address);
    }

    return result;
  }

  /* ═══════════════════════════════════════════════════════════
   * RUN
   * ═══════════════════════════════════════════════════════════ */

  /* ═══════════════════════════════════════════════════════════
   * AUTO DUMP — runs immediately, no function call needed
   * Paste everything between the ===== lines and share it.
   * ═══════════════════════════════════════════════════════════ */
  (function autoDump() {
    console.group('%c[PIEGA] ===== AUTO DUMP (copy everything in this group) =====',
      'color:#fff;background:#7c3aed;padding:3px 8px;border-radius:4px;font-weight:bold;');

    // 1. Page URL & title
    console.log('URL:', location.href);
    console.log('Title:', document.title);

    // 2. __NEXT_DATA__ presence
    const ndEl = document.getElementById('__NEXT_DATA__');
    console.log('__NEXT_DATA__ found:', !!ndEl);
    if (ndEl) {
      try {
        const nd = JSON.parse(ndEl.textContent);
        console.log('__NEXT_DATA__ (full):', nd);
      } catch (e) { console.warn('__NEXT_DATA__ parse error:', e); }
    }

    // 3. All inline <script> contents (first 800 chars each)
    const inlineScripts = [...document.querySelectorAll('script:not([src])')];
    console.group(`Inline <script> tags: ${inlineScripts.length} total`);
    inlineScripts.forEach((s, i) => {
      const t = s.textContent?.trim();
      if (t) console.log(`script[${i}] type=${s.type || '(none)'} len=${t.length}:`, t.slice(0, 800));
    });
    console.groupEnd();

    // 4. All <meta> tags
    const allMeta = [...document.querySelectorAll('meta')].map(m => ({
      name: m.name, property: m.getAttribute('property'), content: m.content
    }));
    console.log('All <meta> tags:', allMeta);

    // 5. All img srcs containing 'map' or 'lat'
    const mapImgs = [...document.querySelectorAll('img')]
      .map(i => i.getAttribute('src') || i.getAttribute('data-src') || '')
      .filter(s => /map|latit|longit|geo/i.test(s));
    console.log('Map img srcs:', mapImgs);

    // 6. #mapTitleScrollAnchor
    console.log('#mapTitleScrollAnchor:', document.getElementById('mapTitleScrollAnchor')?.textContent?.trim() ?? '(not found)');

    // 7. Quick regex scan across ALL script text for lat/lng numbers
    const allScriptText = inlineScripts.map(s => s.textContent).join('\n');
    const latMatches = [...allScriptText.matchAll(/["']?latitud[e]?["']?\s*[:=]\s*([\-\d.]+)/gi)].map(m => m[1]);
    const lngMatches = [...allScriptText.matchAll(/["']?longitud[e]?["']?\s*[:=]\s*([\-\d.]+)/gi)].map(m => m[1]);
    console.log('All latitude values found in scripts:', latMatches);
    console.log('All longitude values found in scripts:', lngMatches);

    console.groupEnd();
    console.log('%c[PIEGA] ===== END OF DUMP =====', 'color:#fff;background:#7c3aed;padding:3px 8px;border-radius:4px;font-weight:bold;');
  })();

  extractPropertyData().then((data) => {
    // ── 1. Console output (clearly labelled) ─────────────────
    console.log(
      '%c[PIEGA] extracted:',
      'color:#7c3aed;font-weight:bold;font-size:13px;background:#f5f0ff;padding:2px 6px;border-radius:4px;',
      data,
    );

    // ── 2. Persist for popup (keyed by listing ID) ────────────
    if (data) {
      const key = `piega:${data.listingId ?? 'unknown'}`;
      chrome.storage.local.set({
        [key]:           data,
        'piega:lastKey': key,
      }).catch(() => {});
    }

    // ── 3. Notify background service worker ──────────────────
    chrome.runtime.sendMessage({ type: 'PIEGA_DATA', payload: data }).catch(() => {});

    // ── 4. Cache for popup requests ──────────────────────────
    window.__piegaData = data;
  });

  // ── 5. Respond to popup data requests ──────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PIEGA_GET_DATA') {
      sendResponse({ payload: window.__piegaData ?? null });
    }
    return false;
  });

  /* ═══════════════════════════════════════════════════════════
   * DEBUG HELPER — call window.piegaDebug() from DevTools console
   *
   * Prints a compact report you can copy-paste to share:
   *   1. __NEXT_DATA__ pageProps (truncated to 8 KB for readability)
   *   2. All <script> tags that mention lat/lon/coordinate/location
   *   3. All map-related img src values
   *   4. Relevant <meta> tags
   *   5. The current extracted result (window.__piegaData)
   * ═══════════════════════════════════════════════════════════ */
  window.piegaDebug = function () {
    console.group('%c[PIEGA] DEBUG REPORT', 'color:#fff;background:#7c3aed;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:13px;');

    // ── 1. __NEXT_DATA__ pageProps ──────────────────────────
    const ndEl = document.getElementById('__NEXT_DATA__');
    if (ndEl) {
      try {
        const nd = JSON.parse(ndEl.textContent);
        const pp = nd?.props?.pageProps;
        console.group('1️⃣  __NEXT_DATA__.props.pageProps  (keys: ' + (pp ? Object.keys(pp).join(', ') : 'N/A') + ')');
        // Print each top-level key separately so Chrome collapses them
        if (pp) {
          for (const [k, v] of Object.entries(pp)) {
            console.log(`  ▸ pageProps.${k}:`, v);
          }
        } else {
          console.log('  (pageProps not found)', nd);
        }
        console.groupEnd();
      } catch (e) {
        console.warn('  __NEXT_DATA__ parse error:', e);
      }
    } else {
      console.warn('1️⃣  __NEXT_DATA__ element NOT FOUND in DOM');
    }

    // ── 2. Inline <script> tags mentioning coordinates ──────
    const coordScripts = [...document.querySelectorAll('script:not([src])')]
      .filter(s => /latit|longit|coord|location|latlng|geo/i.test(s.textContent))
      .map(s => s.textContent.slice(0, 500)); // first 500 chars each
    console.group(`2️⃣  Inline <script> tags mentioning coordinates (${coordScripts.length} found)`);
    coordScripts.forEach((t, i) => console.log(`  Script #${i}:`, t));
    console.groupEnd();

    // ── 3. Map img src values ────────────────────────────────
    const mapImgs = [...document.querySelectorAll('img')]
      .map(img => img.getAttribute('src') || img.getAttribute('data-src') || '')
      .filter(src => src.includes('map') || src.includes('latitude') || src.includes('geo'));
    console.group(`3️⃣  Map-related <img> src values (${mapImgs.length} found)`);
    mapImgs.forEach((src, i) => console.log(`  img[${i}]:`, src));
    console.groupEnd();

    // ── 4. Relevant <meta> tags ──────────────────────────────
    const metas = [...document.querySelectorAll('meta')]
      .filter(m => /latit|longit|og:|geo|position|coord/i.test(
        (m.getAttribute('name') || '') + (m.getAttribute('property') || '')
      ))
      .map(m => ({
        name:     m.getAttribute('name'),
        property: m.getAttribute('property'),
        content:  m.getAttribute('content'),
      }));
    console.group(`4️⃣  Relevant <meta> tags (${metas.length} found)`);
    metas.forEach(m => console.log('  ', m));
    console.groupEnd();

    // ── 5. mapTitleScrollAnchor heading ─────────────────────
    const heading = document.getElementById('mapTitleScrollAnchor');
    console.log('5️⃣  #mapTitleScrollAnchor text:', heading?.textContent?.trim() ?? '(not found)');

    // ── 6. Current extracted data ────────────────────────────
    console.log('6️⃣  window.__piegaData (current result):', window.__piegaData ?? '(not yet set — still extracting?)');

    console.groupEnd();
    console.log('%c[PIEGA] Copy everything above and share it!', 'color:#7c3aed;font-weight:bold;');
  };

  console.log(
    '%c[PIEGA] Debug helper ready. Run %cpiegaDebug()%c in the console to get a full diagnostic report.',
    'color:#7c3aed;font-weight:bold;',
    'color:#7c3aed;font-weight:bold;background:#f5f0ff;padding:0 4px;border-radius:3px;font-family:monospace;',
    'color:#7c3aed;font-weight:bold;',
  );

})();
