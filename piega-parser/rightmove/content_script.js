/**
 * piega-parser — rightmove/content_script.js
 *
 * Injected silently into every Rightmove property page:
 *   *://*.rightmove.co.uk/properties/*
 *
 * What it does:
 *   1. Tries 5 sources in priority order to extract property data.
 *   2. Persists the result to chrome.storage.local keyed by listing ID.
 *   3. Notifies the background service worker (for DevTools / external consumers).
 *   4. Exposes window.__piegaData and window.piegaDebug() for manual inspection.
 *
 * What it does NOT do:
 *   • Modify the page in any way.
 *   • Make any network requests.
 *   • Show any UI.
 *
 * Canonical data shape (all fields always present, missing values → null):
 *   {
 *     _source, _parsedAt,
 *     listingId, portal,
 *     askingPrice, priceCurrency, priceDisplay,
 *     propertyType, bedrooms, bathrooms,
 *     latitude, longitude,
 *     address, postcode,
 *     description, agent, tenure,
 *     addedOrReduced, imageCount,
 *     photos:     [ { url: string, caption: string|null } ],
 *     floorplans: [ { url: string, thumbnail: string } ],
 *   }
 */

(function piegaRightmove() {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
   * HELPERS
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
   * Convert a Rightmove thumbnail URL to the full-size equivalent.
   *   …/dir/property-photo/<hash>/<id>/<hash>_max_296x197.jpg
   *   →  …/property-photo/<hash>/<id>/<hash>.jpg
   * Works for both property-photo and property-floorplan paths.
   */
  function toFullPhotoUrl(url) {
    if (!url) return null;
    return url
      .replace(/\/dir\/(property-)/, '/$1')   // remove leading /dir/ segment
      .replace(/_max_\d+x\d+(\.jpg)/i, '$1'); // remove _max_WxH suffix
  }

  /** Build the canonical shape from a Rightmove propertyData blob. */
  function normalise(pd, source) {
    return {
      _source:        source,
      _parsedAt:      new Date().toISOString(),
      portal:         'rightmove',
      listingId:      pd.id            ?? extractIdFromUrl(),
      askingPrice:    pd.price?.amount ?? null,
      priceCurrency:  pd.price?.currencyCode ?? 'GBP',
      priceDisplay:   pd.price?.displayPrices?.[0]?.displayPrice ?? null,
      propertyType:   pd.propertySubType ?? pd.propertyType ?? null,
      bedrooms:       pd.bedrooms        ?? null,
      bathrooms:      pd.bathrooms       ?? null,
      latitude:       pd.location?.latitude  ?? null,
      longitude:      pd.location?.longitude ?? null,
      address:        pd.location?.address   ?? pd.address?.displayAddress ?? null,
      postcode:       extractPostcode(
                        pd.location?.postcode ??
                        pd.location?.address  ??
                        pd.address?.postcode  ?? ''
                      ),
      description:    pd.text?.description ?? pd.description ?? null,
      agent:          pd.customer?.branchDisplayName ?? null,
      tenure:         pd.tenure?.tenureType ?? null,
      addedOrReduced: pd.listingHistory?.listingUpdateReason ?? null,
      imageCount:     Array.isArray(pd.images) ? pd.images.length : null,
      photos:         Array.isArray(pd.images)
                        ? pd.images.map(img => {
                            // Try known field names first, then scan ALL string values
                            // for anything that looks like a Rightmove media URL
                            const rawUrl =
                              img.url ?? img.src ?? img.srcUrl ?? img.imageUrl ??
                              img.thumbnail ?? img.originalUrl ?? img.fullUrl ??
                              (typeof img === 'string' ? img : null) ??
                              Object.values(img).find(
                                v => typeof v === 'string' && v.includes('rightmove.co.uk')
                              );
                            return {
                              url:     toFullPhotoUrl(rawUrl ?? null),
                              caption: img.caption ?? img.alt ?? img.title ?? null,
                            };
                          }).filter(p => p.url)
                        : [],
      floorplans:     Array.isArray(pd.floorplanImages ?? pd.floorplans)
                        ? (pd.floorplanImages ?? pd.floorplans).map(fp => {
                            const rawUrl =
                              fp.url ?? fp.src ?? fp.srcUrl ??
                              (typeof fp === 'string' ? fp : null) ??
                              Object.values(fp).find(
                                v => typeof v === 'string' && v.includes('rightmove.co.uk')
                              );
                            return { url: toFullPhotoUrl(rawUrl ?? null), thumbnail: rawUrl ?? null };
                          }).filter(f => f.url)
                        : [],
    };
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 1 — __NEXT_DATA__  ★ most reliable ★
   *
   * Rightmove is a Next.js app. Server-side props are serialised
   * into a <script id="__NEXT_DATA__"> element on every page.
   *
   * Checked paths inside props.pageProps:
   *   .propertyData  (primary)
   *   .property      (secondary)
   *   .listing       (tertiary)
   *   .pageData.propertyData  (fallback)
   * ═══════════════════════════════════════════════════════════ */

  function fromNextData() {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return null;

    let nd;
    try { nd = JSON.parse(el.textContent); } catch (e) {
      console.warn('[PIEGA-PARSER] __NEXT_DATA__ parse error:', e);
      return null;
    }

    const pp = nd?.props?.pageProps;
    if (!pp) return null;

    const pd =
      pp.propertyData           ??
      pp.property               ??
      pp.listing                ??
      pp.pageData?.propertyData ??
      null;

    if (!pd) return null;

    const result = normalise(pd, '__NEXT_DATA__');

    // Deep-scan fallback for lat/lng if the standard path missed it
    if (!result.latitude || !result.longitude) {
      const found = deepFindLatLng(pd) || deepFindLatLng(nd);
      if (found) {
        result.latitude       = found.latitude;
        result.longitude      = found.longitude;
        result._latLngSource  = 'deepScan';
      }
    }

    console.log('[PIEGA-PARSER] ✅ fromNextData:', result);
    return result;
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 2 — Inline <script> variable assignments
   *
   * Rightmove sometimes writes server-rendered globals into inline
   * <script> tags (e.g. window.PAGE_MODEL = {...}).
   * Content scripts cannot read window globals from the page's JS
   * world — but they CAN read the raw .textContent of <script> nodes.
   *
   * Strategy A: find a JSON object literal that contains lat/lng.
   * Strategy B: regex key=value or key:value extraction.
   * ═══════════════════════════════════════════════════════════ */

  function fromInlineScripts() {
    const scripts = document.querySelectorAll('script:not([src])');

    for (const script of scripts) {
      const text = script.textContent;
      if (!text) continue;

      // ── Strategy A — JSON object walk ───────────────────────
      if (/latit|longit/i.test(text)) {
        let pos = 0;
        while ((pos = text.indexOf('{', pos)) !== -1) {
          for (let end = pos + 2; end <= text.length; end++) {
            if (text[end - 1] !== '}') continue;
            try {
              const obj = JSON.parse(text.slice(pos, end));
              const ll  = deepFindLatLng(obj);
              if (ll) {
                const pd = obj?.propertyData ?? obj?.property ?? obj?.listing ?? null;
                if (pd) {
                  console.log('[PIEGA-PARSER] ✅ fromInlineScripts (A — full pd)');
                  return normalise(pd, 'inlineScript');
                }
                // Partial — lat/lng only; enrichment will fill the rest
                console.log('[PIEGA-PARSER] ✅ fromInlineScripts (A — lat/lng only):', ll);
                return {
                  _source: 'inlineScript',
                  _parsedAt: new Date().toISOString(),
                  portal: 'rightmove',
                  listingId: extractIdFromUrl(),
                  askingPrice: null, priceCurrency: 'GBP', priceDisplay: null,
                  propertyType: null, bedrooms: null, bathrooms: null,
                  latitude: ll.latitude, longitude: ll.longitude,
                  address: null, postcode: null, description: null,
                  agent: null, tenure: null, addedOrReduced: null, imageCount: null,
                  photos: [], floorplans: [],
                };
              }
            } catch (_) {}
          }
          pos++;
        }
      }

      // ── Strategy B — regex key=value / key:value ────────────
      const latMatch = text.match(/["']?latitude["']?\s*[:=]\s*([\-\d.]+)/);
      const lngMatch = text.match(/["']?longitude["']?\s*[:=]\s*([\-\d.]+)/);
      if (latMatch && lngMatch) {
        const lat = parseFloat(latMatch[1]);
        const lng = parseFloat(lngMatch[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('[PIEGA-PARSER] ✅ fromInlineScripts (B — regex):', lat, lng);
          return {
            _source: 'inlineScriptRegex',
            _parsedAt: new Date().toISOString(),
            portal: 'rightmove',
            listingId: extractIdFromUrl(),
            askingPrice: null, priceCurrency: 'GBP', priceDisplay: null,
            propertyType: null, bedrooms: null, bathrooms: null,
            latitude: lat, longitude: lng,
            address: null, postcode: null, description: null,
            agent: null, tenure: null, addedOrReduced: null, imageCount: null,
            photos: [], floorplans: [],
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
   * Place markup — reliable for lat/lng, address, and description.
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
        const TYPES = ['Residence', 'Place', 'Product', 'RealEstateListing'];
        if (!TYPES.some(k => t.includes(k))) continue;

        console.log('[PIEGA-PARSER] ✅ fromSchemaOrg (@type:', t, ')');
        return {
          _source:        'ld+json',
          _parsedAt:      new Date().toISOString(),
          portal:         'rightmove',
          listingId:      extractIdFromUrl(),
          askingPrice:    item.offers?.price ? Number(item.offers.price) : null,
          priceCurrency:  item.offers?.priceCurrency ?? 'GBP',
          priceDisplay:   null,
          propertyType:   t ?? null,
          bedrooms:       item.numberOfRooms ?? item.numberOfBedrooms ?? null,
          bathrooms:      item.numberOfBathroomsTotal ?? null,
          latitude:       item.geo?.latitude  ? parseFloat(item.geo.latitude)  : null,
          longitude:      item.geo?.longitude ? parseFloat(item.geo.longitude) : null,
          address:        item.address?.streetAddress ?? null,
          postcode:       item.address?.postalCode    ?? null,
          description:    item.description ?? null,
          agent:          null,
          tenure:         null,
          addedOrReduced: null,
          imageCount:     null,
          photos:         item.image
                            ? (Array.isArray(item.image) ? item.image : [item.image])
                                .map(u => ({ url: typeof u === 'string' ? u : u?.url ?? null, caption: null }))
                                .filter(p => p.url)
                            : [],
          floorplans:     [],
        };
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 4 — DOM scraping  ⚠ most fragile ⚠
   *
   * Rightmove uses hashed CSS class names that change on every
   * deploy. Prefer data-testid attributes (versioned by Rightmove).
   * og: meta tags for lat/lng are the most stable DOM source.
   * ═══════════════════════════════════════════════════════════ */

  function fromDOM() {
    /** First non-empty textContent from a list of CSS selectors. */
    const text = (...selectors) => {
      for (const sel of selectors) {
        try {
          const t = document.querySelector(sel)?.textContent?.trim();
          if (t) return t;
        } catch (_) {}
      }
      return null;
    };

    /** Content attribute of a <meta name|property="…"> element. */
    const meta = (prop) =>
      document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)
              ?.getAttribute('content') ?? null;

    const rawPrice = text(
      '[data-testid="primaryPrice"] span:first-child',
      '[data-monitor-testid="primaryPrice"] span:first-child',
      '[data-testid="price"]',
      '.propertyHeaderPrice',
      'p[class*="price" i]',
      'div[class*="Price"] p',
    );

    const rawAddress = text(
      'h1[itemprop="streetAddress"]',
      'address[data-testid="address-wrapper"]',
      'h1[class*="address" i]',
      'h1',
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

    // "Reduced on 21/03/2026" / "Added on 21/03/2026" etc.
    const rawAddedOrReduced = text(
      '[class*="reducedOn" i]',
      '[class*="addedOn" i]',
      '[class*="listingHistory" i]',
    ) || (() => {
      // Scan all text nodes for the "Reduced on" / "Added on" pattern
      const match = document.body?.textContent?.match(
        /((?:Reduced|Added|Re-listed)[^\n]{0,30}\d{2}\/\d{2}\/\d{4})/
      );
      return match ? match[1].trim() : null;
    })();

    // Property type from page title or heading (e.g. "2 bedroom detached house")
    const rawPropertyType = text(
      '[data-testid="property-type"]',
      '[itemprop="name"]',
    ) || (() => {
      const m = document.title?.match(
        /bedroom[s]?\s+([\w\s-]+?)\s+for\s+sale/i
      );
      return m ? m[1].trim() : null;
    })();

    console.log('[PIEGA-PARSER] ✅ fromDOM (fallback)');
    return {
      _source:        'DOM',
      _parsedAt:      new Date().toISOString(),
      portal:         'rightmove',
      listingId:      extractIdFromUrl(),
      askingPrice:    parsePrice(rawPrice),
      priceCurrency:  'GBP',
      priceDisplay:   rawPrice,
      propertyType:   rawPropertyType,
      bedrooms:       bedroomsRaw
                        ? (parseInt(bedroomsRaw.match(/\d+/)?.[0], 10) || null)
                        : null,
      bathrooms:      null,
      latitude:       meta('og:latitude')  ? parseFloat(meta('og:latitude'))  : null,
      longitude:      meta('og:longitude') ? parseFloat(meta('og:longitude')) : null,
      address:        rawAddress,
      postcode:       extractPostcode(rawAddress),
      description:    rawDescription,
      agent:          null,
      tenure:         null,
      addedOrReduced: rawAddedOrReduced,
      imageCount:     null,
      photos:         [],  // filled by enrichment step
      floorplans:     [],  // filled by enrichment step
    };
  }

  /* ═══════════════════════════════════════════════════════════
   * MEDIA — DOM extraction of photos and floorplans
   *
   * Photos:    <a itemprop="photo"> … <meta itemprop="contentUrl" content="…">
   * Floorplan: <a href="…#/floorplan…"><img src="…property-floorplan…">
   * Both are stable schema.org / Rightmove patterns.
   * ═══════════════════════════════════════════════════════════ */

  function extractMediaFromDOM() {
    const seenUrls = new Set();
    function dedup(arr) {
      return arr.filter(p => {
        if (!p.url || seenUrls.has(p.url)) return false;
        seenUrls.add(p.url);
        return true;
      });
    }

    // ── Strategy A: schema.org itemprop (most reliable, oldest pattern) ──
    let photos = dedup(
      [...document.querySelectorAll('a[itemprop="photo"]')].map(a => ({
        url:     toFullPhotoUrl(a.querySelector('meta[itemprop="contentUrl"]')?.getAttribute('content')),
        caption: a.getAttribute('title') ?? null,
      }))
    );

    // ── Strategy B: any img[src*="property-photo"] (gallery images) ──────
    if (!photos.length) {
      photos = dedup(
        [...document.querySelectorAll('img[src*="property-photo"]')].map(img => ({
          url:     toFullPhotoUrl(img.getAttribute('src')),
          caption: img.getAttribute('alt') ?? null,
        }))
      );
    }

    // ── Strategy C: og:image meta + data-testid gallery items ────────────
    if (!photos.length) {
      const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImg && ogImg.includes('rightmove.co.uk')) {
        photos = [{ url: toFullPhotoUrl(ogImg), caption: null }];
      }
    }

    // ── Floorplans: anchor linking to #/floorplan containing a floorplan img
    const seenFp = new Set();
    const rawFloorplans = [
      ...document.querySelectorAll(
        'a[href*="floorplan"] img[src*="floorplan"], a[href*="floorplan"] img[alt*="loorplan"], img[src*="property-floorplan"]'
      )
    ].map(img => {
      const thumb = img.getAttribute('src');
      return { url: toFullPhotoUrl(thumb), thumbnail: thumb ?? null };
    }).filter(f => {
      if (!f.url || seenFp.has(f.url)) return false;
      seenFp.add(f.url);
      return true;
    });

    console.log(
      '[PIEGA-PARSER] extractMediaFromDOM:',
      photos.length, 'photos,',
      rawFloorplans.length, 'floorplan(s)'
    );
    return { photos, floorplans: rawFloorplans };
  }

  /* ═══════════════════════════════════════════════════════════
   * SOURCE 5 — Rightmove map <img> URL  ★ reliable lat/lng ★
   *
   * The map thumbnail always uses:
   *   https://media.rightmove.co.uk/map/_generate?…&latitude=XX&longitude=YY
   *
   * React renders it AFTER hydration, so we need a MutationObserver.
   * The <h2 id="mapTitleScrollAnchor"> heading contains the full address.
   * Used as an enrichment step — not a primary source.
   * ═══════════════════════════════════════════════════════════ */

  /** Sync read of map img URL + heading (call after DOM is ready). */
  function readMapElements() {
    const result = {};

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
      } catch (_) {}
    }

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

  /** Wait up to `timeoutMs` ms for the map img to appear, then resolve. */
  function waitForMapElements(timeoutMs) {
    if (timeoutMs === undefined) timeoutMs = 6000;
    return new Promise((resolve) => {
      // Already present?
      const immediate = readMapElements();
      if (immediate && immediate.latitude) { resolve(immediate); return; }

      const observer = new MutationObserver(() => {
        const data = readMapElements();
        if (data && data.latitude) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(data);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src'],
      });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(readMapElements()); // last-ditch attempt
      }, timeoutMs);
    });
  }

  /* ═══════════════════════════════════════════════════════════
   * ORCHESTRATOR — run all sources, enrich, return canonical shape
   * ═══════════════════════════════════════════════════════════ */

  async function parse() {
    // Priority order: most reliable → least reliable
    const result =
      fromNextData()      ||
      fromInlineScripts() ||
      fromSchemaOrg()     ||
      fromDOM();

    if (!result) {
      console.warn('[PIEGA-PARSER] ❌ All sources failed — no data extracted.');
      return null;
    }

    // ── Enrichment 1: lat/lng + address from map img (waits for React) ──
    if (!result.latitude || !result.longitude || !result.address) {
      const mapData = await waitForMapElements(6000);
      if (mapData) {
        if (!result.latitude  && mapData.latitude)  result.latitude  = mapData.latitude;
        if (!result.longitude && mapData.longitude) result.longitude = mapData.longitude;
        if (!result.address   && mapData.address)   result.address   = mapData.address;
        if (!result.postcode  && mapData.postcode)  result.postcode  = mapData.postcode;
      }
    }

    // ── Enrichment 2: og: meta tag fallback for lat/lng ─────────────────
    if (!result.latitude || !result.longitude) {
      const lat = document.querySelector('meta[property="og:latitude"]')?.getAttribute('content');
      const lng = document.querySelector('meta[property="og:longitude"]')?.getAttribute('content');
      if (lat) result.latitude  = parseFloat(lat);
      if (lng) result.longitude = parseFloat(lng);
    }

    // ── Enrichment 3: postcode from address string ───────────────────────
    if (!result.postcode && result.address) {
      result.postcode = extractPostcode(result.address);
    }

    // ── Enrichment 4: price from DOM if primary source missed it ────────
    if (!result.askingPrice) {
      const rawPrice =
        document.querySelector('[data-testid="primaryPrice"] span:first-child, [data-monitor-testid="primaryPrice"] span:first-child')
                ?.textContent?.trim() ?? null;
      if (rawPrice) {
        result.askingPrice  = parsePrice(rawPrice);
        result.priceDisplay = rawPrice;
      }
    }

    // ── Enrichment 5: addedOrReduced from DOM if missing ────────────────
    if (!result.addedOrReduced) {
      const m = document.body?.textContent?.match(
        /((?:Reduced|Added|Re-listed)[^\n]{0,30}\d{2}\/\d{2}\/\d{4})/
      );
      if (m) result.addedOrReduced = m[1].trim();
    }

    // ── Enrichment 6: photos + floorplans from DOM ───────────────────────
    // ── Enrichment 6: photos + floorplans from DOM ───────────────────────
    // Always run DOM extraction — it's the most reliable source for media.
    // __NEXT_DATA__ images may use unknown field names; DOM is authoritative.
    const media = extractMediaFromDOM();
    if (!result.photos?.length     && media.photos.length)     result.photos     = media.photos;
    if (!result.floorplans?.length && media.floorplans.length) result.floorplans = media.floorplans;
    if (result.photos?.length) result.imageCount = result.photos.length;

    return result;
  }

  /* ═══════════════════════════════════════════════════════════
   * DEBUG HELPER  — call piegaDebug() from DevTools console
   * ═══════════════════════════════════════════════════════════ */

  window.piegaDebug = function () {
    console.group('%c[PIEGA-PARSER] DEBUG REPORT',
      'color:#fff;background:#7c3aed;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:13px;');

    // 1. __NEXT_DATA__
    const ndEl = document.getElementById('__NEXT_DATA__');
    if (ndEl) {
      try {
        const nd = JSON.parse(ndEl.textContent);
        const pp = nd?.props?.pageProps;
        console.group('1️⃣  __NEXT_DATA__.props.pageProps keys:', pp ? Object.keys(pp).join(', ') : 'N/A');
        if (pp) Object.entries(pp).forEach(([k, v]) => console.log(`  ▸ ${k}:`, v));
        console.groupEnd();
      } catch (e) { console.warn('  __NEXT_DATA__ parse error:', e); }
    } else {
      console.warn('1️⃣  __NEXT_DATA__ NOT FOUND');
    }

    // 2. Coordinate-bearing inline scripts
    const coordScripts = [...document.querySelectorAll('script:not([src])')]
      .filter(s => /latit|longit|coord|latlng|geo/i.test(s.textContent))
      .map(s => s.textContent.slice(0, 500));
    console.group(`2️⃣  Inline scripts mentioning coordinates (${coordScripts.length})`);
    coordScripts.forEach((t, i) => console.log(`  #${i}:`, t));
    console.groupEnd();

    // 3. Map img srcs
    const mapImgs = [...document.querySelectorAll('img')]
      .map(i => i.getAttribute('src') || '')
      .filter(s => /map|latitude|geo/i.test(s));
    console.group(`3️⃣  Map-related img srcs (${mapImgs.length})`);
    mapImgs.forEach((s, i) => console.log(`  [${i}]:`, s));
    console.groupEnd();

    // 4. Geo/position meta tags
    const metas = [...document.querySelectorAll('meta')]
      .filter(m => /latit|longit|og:|geo|position/i.test(
        (m.getAttribute('name') || '') + (m.getAttribute('property') || '')
      ))
      .map(m => ({ name: m.getAttribute('name'), property: m.getAttribute('property'), content: m.getAttribute('content') }));
    console.group(`4️⃣  Relevant meta tags (${metas.length})`);
    metas.forEach(m => console.log(' ', m));
    console.groupEnd();

    // 5. mapTitleScrollAnchor
    console.log('5️⃣  #mapTitleScrollAnchor:',
      document.getElementById('mapTitleScrollAnchor')?.textContent?.trim() ?? '(not found)');

    // 6. Current parsed result
    console.log('6️⃣  window.__piegaData:', window.__piegaData ?? '(not set yet)');

    console.groupEnd();
  };

  /* ═══════════════════════════════════════════════════════════
   * RUN
   * ═══════════════════════════════════════════════════════════ */

  parse().then((data) => {
    window.__piegaData = data;

    // Log to console
    console.log(
      '%c[PIEGA-PARSER] result:',
      'color:#7c3aed;font-weight:bold;font-size:13px;background:#f5f0ff;padding:2px 6px;border-radius:4px;',
      data,
    );

    if (!data) return;

    // Persist to chrome.storage.local
    const key = `piega:rightmove:${data.listingId ?? 'unknown'}`;
    chrome.storage.local.set({
      [key]:              data,
      'piega:last':       { key, portal: 'rightmove', listingId: data.listingId },
    }).catch(() => {});

    // Notify background service worker
    chrome.runtime.sendMessage({ type: 'PIEGA_PARSED', payload: data }).catch(() => {});
  });

  // Respond to on-demand data requests (e.g. from DevTools extension panel)
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PIEGA_GET_DATA') {
      sendResponse({ payload: window.__piegaData ?? null });
    }
    return false;
  });

  console.log(
    '%c[PIEGA-PARSER] Rightmove parser loaded. Call %cpiegaDebug()%c for diagnostics.',
    'color:#7c3aed;font-weight:bold;',
    'color:#7c3aed;font-weight:bold;background:#f5f0ff;padding:0 4px;border-radius:3px;font-family:monospace;',
    'color:#7c3aed;font-weight:bold;',
  );

})();
