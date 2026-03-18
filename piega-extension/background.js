/**
 * Piega — background.js  (Manifest V3 Service Worker)
 *
 * Responsibilities:
 *  - Relay PIEGA_DATA messages from content scripts to storage.
 *  - Act as a central cache so the popup can retrieve data even
 *    after a service worker restart.
 *  - (Future) Send data to Piega backend API.
 */

'use strict';

// ── Receive extracted data from content scripts ─────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'PIEGA_DATA') return false;

  const { payload } = msg;
  if (!payload || !sender.tab?.id) return false;

  // Store by listing ID (content script also stores this, but
  // background keeps a tab-ID index as a fallback lookup path).
  const tabKey  = `piega:tab:${sender.tab.id}`;
  const dataKey = `piega:${payload.listingId ?? 'unknown'}`;

  chrome.storage.local.set({
    [dataKey]:         payload,
    [tabKey]:          dataKey,  // tab → key pointer
    'piega:lastKey':   dataKey,
  });

  sendResponse({ ok: true });
  return false;
});

// ── Clean up stale tab entries when a tab closes ─────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`piega:tab:${tabId}`);
});
