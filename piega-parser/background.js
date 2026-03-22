/**
 * piega-parser — background.js (service worker)
 *
 * Minimal service worker. Responsibilities:
 *   1. Receive PIEGA_PARSED messages from content scripts and log them.
 *   2. Answer PIEGA_GET_LAST requests with the most recently parsed listing.
 *   3. Answer PIEGA_GET_ALL requests with everything in storage.
 *
 * Storage key convention:
 *   piega:rightmove:<listingId>  →  canonical data object
 *   piega:last                   →  { key, portal, listingId } of the latest parse
 */

'use strict';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── Content script → background: new data parsed ──────────────────────
  if (msg.type === 'PIEGA_PARSED') {
    const d = msg.payload;
    if (d) {
      console.log(
        `[PIEGA-PARSER] New listing parsed (${d.portal} / ${d.listingId})`,
        d,
      );
    }
    // No async response needed — fire and forget
    return false;
  }

  // ── On-demand: return the last parsed listing ──────────────────────────
  if (msg.type === 'PIEGA_GET_LAST') {
    chrome.storage.local.get('piega:last').then((store) => {
      const meta = store['piega:last'];
      if (!meta?.key) { sendResponse({ payload: null }); return; }
      chrome.storage.local.get(meta.key).then((s) => {
        sendResponse({ payload: s[meta.key] ?? null });
      });
    });
    return true; // keep channel open for async sendResponse
  }

  // ── On-demand: return all stored piega listings ────────────────────────
  if (msg.type === 'PIEGA_GET_ALL') {
    chrome.storage.local.get(null).then((store) => {
      const listings = Object.fromEntries(
        Object.entries(store).filter(([k]) => k.startsWith('piega:') && k !== 'piega:last')
      );
      sendResponse({ payload: listings });
    });
    return true;
  }

  return false;
});

console.log('[PIEGA-PARSER] Background service worker started.');
