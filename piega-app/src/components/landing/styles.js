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
`;
