import { C } from "@/lib/theme";

export const STYLES = `
  * { box-sizing: border-box; }
  ::selection { background: ${C.terracotta}; color: ${C.paper}; }

  .piega-page {
    background: ${C.dark};
    color: ${C.paper};
    min-height: 100vh;
  }

  .piega-mosaic {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 10px;
    grid-auto-flow: dense;
    align-items: start;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .piega-large  { grid-column: span 7; }
  .piega-medium { grid-column: span 4; }
  .piega-small  { grid-column: span 2; }
  .piega-text   { grid-column: span 4; }
  .piega-video  { grid-column: span 5; }

  @media (max-width: 1024px) {
    .piega-mosaic { grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .piega-large  { grid-column: span 6; }
    .piega-medium { grid-column: span 3; }
    .piega-small  { grid-column: span 2; }
    .piega-text   { grid-column: span 3; }
    .piega-video  { grid-column: span 4; }
  }

  @media (max-width: 640px) {
    .piega-mosaic { grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .piega-large  { grid-column: span 4; }
    .piega-medium { grid-column: span 4; }
    .piega-small  { grid-column: span 2; }
    .piega-text   { grid-column: span 4; }
    .piega-video  { grid-column: span 4; }
  }

  .piega-desktop-only { display: block; }
  .piega-mobile-only  { display: none; }
  @media (max-width: 768px) {
    .piega-desktop-only { display: none !important; }
    .piega-mobile-only  { display: block !important; }
  }

  /* ── Split CTA + property card grid ── */
  .piega-split {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 0;
    min-height: 600px;
    max-height: 800px;
    overflow: hidden;
    position: relative;
  }
  .piega-split::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: calc(100% - 340px);
    height: 180px;
    background: linear-gradient(to bottom, transparent, ${C.dark});
    pointer-events: none;
    z-index: 2;
  }
  .piega-split-cta {
    position: sticky;
    top: 0;
    align-self: start;
    padding: 48px 32px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .piega-split-grid-wrap {
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 12px 12px 12px 0;
  }
  .piega-split-grid-wrap::-webkit-scrollbar { display: none; }
  .piega-card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .piega-prop-card {
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    background: ${C.darkMid};
    text-decoration: none;
    display: block;
    transition: box-shadow 0.3s ease;
  }
  .piega-prop-card:hover {
    box-shadow: 0 2px 16px rgba(0,0,0,0.3);
  }
  /* Clip-path slider */
  .piega-card-slider {
    position: relative;
    aspect-ratio: 16/9;
    overflow: hidden;
    cursor: ew-resize;
    touch-action: none;
  }
  .piega-card-slider img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }
  .piega-card-slider-handle {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background: ${C.paper};
    opacity: 0.7;
    z-index: 3;
    pointer-events: none;
  }
  .piega-card-slider-handle::after {
    content: '\u2194';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${C.paper};
    color: ${C.dark};
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 6px rgba(0,0,0,0.5);
  }
  /* Image labels */
  .piega-card-lbl {
    position: absolute;
    bottom: 6px;
    z-index: 4;
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: ${C.paper};
    background: rgba(26,24,22,0.6);
    backdrop-filter: blur(4px);
    padding: 2px 7px;
    border-radius: 3px;
    pointer-events: none;
  }
  .piega-card-lbl-now  { left: 6px; }
  .piega-card-lbl-poss { right: 6px; }
  .piega-card-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    z-index: 4;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: ${C.paper};
    background: rgba(26,24,22,0.65);
    backdrop-filter: blur(4px);
    padding: 2px 7px;
    border-radius: 3px;
    pointer-events: none;
  }
  /* Card text */
  .piega-card-meta {
    padding: 10px 10px 2px;
  }
  .piega-card-name {
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    font-weight: 600;
    color: ${C.paper};
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .piega-card-arch {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: ${C.warmGrey};
    margin: 3px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .piega-card-cost {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 10px 0;
  }
  .piega-card-cost-label {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: ${C.warmGrey};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .piega-card-cost-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 0.02em;
    color: ${C.terracotta};
  }
  .piega-card-observation {
    font-family: 'EB Garamond', serif;
    font-size: 12px;
    font-style: italic;
    color: ${C.accent};
    padding: 4px 10px 0;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .piega-card-foot {
    padding: 6px 10px 9px;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    color: ${C.accent};
    opacity: 0.5;
    transition: opacity 0.2s;
  }
  .piega-prop-card:hover .piega-card-foot {
    opacity: 1;
  }

  @media (max-width: 900px) {
    .piega-split {
      grid-template-columns: 1fr;
      max-height: none;
    }
    .piega-split::after {
      width: 100%;
    }
    .piega-split-cta {
      position: static;
      padding: 40px 24px;
      text-align: center;
    }
    .piega-split-grid-wrap {
      max-height: 500px;
      padding: 0 12px 12px;
    }
    .piega-card-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
  }

  @media (max-width: 500px) {
    .piega-card-grid {
      grid-template-columns: 1fr;
    }
  }
`;
