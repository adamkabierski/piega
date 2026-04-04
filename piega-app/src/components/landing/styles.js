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
    gap: 10px;
  }
  .piega-prop-card {
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    background: ${C.darkMid};
    cursor: pointer;
    text-decoration: none;
    display: block;
  }
  .piega-prop-card:hover .piega-card-after {
    opacity: 1;
  }
  .piega-prop-card:hover .piega-card-before {
    opacity: 0;
  }
  .piega-card-img-wrap {
    position: relative;
    aspect-ratio: 16/9;
    overflow: hidden;
  }
  .piega-card-before,
  .piega-card-after {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity 0.5s ease;
  }
  .piega-card-before { opacity: 1; z-index: 1; }
  .piega-card-after  { opacity: 0; z-index: 2; }
  .piega-card-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 3;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: ${C.paper};
    background: rgba(26,24,22,0.7);
    backdrop-filter: blur(4px);
    padding: 3px 8px;
    border-radius: 3px;
  }
  .piega-card-meta {
    padding: 8px 10px;
  }
  .piega-card-name {
    font-family: 'Playfair Display', serif;
    font-size: 12px;
    font-weight: 600;
    color: ${C.paper};
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .piega-card-arch {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    color: ${C.warmGrey};
    margin: 2px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 900px) {
    .piega-split {
      grid-template-columns: 1fr;
      max-height: none;
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
