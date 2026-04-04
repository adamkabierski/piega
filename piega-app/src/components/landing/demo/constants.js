import { C } from "@/lib/theme";

/* ── Timing ── */
export const PHASE_DURATIONS = [3000, 2500, 7500, 5500];
export const TOTAL = PHASE_DURATIONS.reduce((a, b) => a + b, 0);
export const PHASE_STARTS = PHASE_DURATIONS.reduce((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + PHASE_DURATIONS[i - 1]);
  return acc;
}, []);
export const MILESTONE_PCT = PHASE_STARTS.map((t) => (t / TOTAL) * 100);

export const MILESTONES = ["Browse", "Click", "Analyse", "Report"];

export const PHASE_LABELS = [
  "This is all Rightmove shows you.",
  "One click. That\u2019s all you do.",
  "Five trained models. One chain of thought.",
  "The full reading. Before and after.",
];

/* Pipeline steps shown during Phase 2 */
export const PIPE_STEPS = [
  { label: "Reading the building", result: "Interwar Semi \u00B7 1930\u20131945" },
  { label: "Spotting what matters", result: "3 issues found \u00B7 5 unknowns flagged" },
  { label: "Designing the renovation", result: "palette \u00B7 materials \u00B7 mood" },
  { label: "Seeing the difference", result: "before \u2192 after" },
  { label: "Writing the full reading", result: "4 chapters \u00B7 ready" },
];
export const PIPE_INTERVAL = 1400;

/* Cursor waypoints per phase: [ms_offset, x%, y%, click?] */
export const CURSOR_SCRIPTS = [
  [[0, 45, 50], [600, 28, 40], [1600, 58, 22], [2600, 80, 16]],
  [[0, 94, 3.5], [500, 94, 3.5, true], [1200, 81, 52], [2000, 81, 52, true]],
  [],
  [],
];

/* Light-mode palette for the Rightmove mockup */
export const RM = {
  bg: "#FFFFFF", bgSoft: "#F7F5F3",
  green: "#00B140", text: "#2C2C2C",
  textMuted: "#8A8580", dummy: "#ECEAE6", dummyDark: "#D8D4CF",
};

/* CSS keyframes shared across panels */
export const DEMO_KEYFRAMES = `
  @keyframes demo-ripple {
    0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.7; }
    100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
  }
  @keyframes demo-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.6); }
  }
  @keyframes demo-node-pulse {
    0%, 100% { box-shadow: 0 0 6px rgba(196,119,91,0.3); }
    50% { box-shadow: 0 0 14px rgba(196,119,91,0.6), 0 0 28px rgba(196,119,91,0.15); }
  }
  @keyframes demo-scan {
    0% { background-position: 0 -100%; }
    100% { background-position: 0 200%; }
  }
  @keyframes demo-fade-in {
    0% { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes demo-report-scroll {
    0%, 3%    { transform: translateY(0); }
    16%, 20%  { transform: translateY(-12%); }
    33%, 38%  { transform: translateY(-26%); }
    53%, 58%  { transform: translateY(-42%); }
    76%, 80%  { transform: translateY(-56%); }
    94%, 100% { transform: translateY(-66%); }
  }
  @keyframes demo-slider-line {
    0%, 6%    { left: 50%; }
    28%, 34%  { left: 25%; }
    62%, 68%  { left: 72%; }
    92%, 100% { left: 50%; }
  }
  @keyframes demo-slider-clip {
    0%, 6%    { clip-path: inset(0 50% 0 0); }
    28%, 34%  { clip-path: inset(0 75% 0 0); }
    62%, 68%  { clip-path: inset(0 28% 0 0); }
    92%, 100% { clip-path: inset(0 50% 0 0); }
  }
  @keyframes demo-ba-merge {
    0%   { gap: clamp(4px,0.6vw,8px); }
    100% { gap: 0px; }
  }
`;
