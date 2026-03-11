"use client";

import { useState, useEffect } from "react";
import { C } from "@/lib/theme";

const STEPS = [
  ["Reading the building\u2026", "parsing property type, era, materials"],
  ["Mapping the context\u2026", "locating the village \u2014 and what surrounds it"],
  ["Running the numbers\u2026", "calculating ten-year cost of ownership"],
  ["Writing the honest version\u2026", "no flattery. almost done."],
];

export default function LoadingSpinner({ onComplete }) {
  const [step, setStep] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (step >= STEPS.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => {
        setStep((s) => s + 1);
        setOpacity(1);
      }, 300);
    }, 1850);

    return () => clearTimeout(timer);
  }, [step, onComplete]);

  const totalTimer = useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 7500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = STEPS[step] || STEPS[STEPS.length - 1];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: C.dark,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      {/* Rotating cross */}
      <div
        style={{
          width: 28,
          height: 28,
          position: "relative",
          margin: "0 auto 36px",
          animation: "rot 4s linear infinite",
        }}
      >
        <div
          style={{
            content: "",
            position: "absolute",
            background: C.accent,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 1,
            height: 28,
          }}
        />
        <div
          style={{
            content: "",
            position: "absolute",
            background: C.accent,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 28,
            height: 1,
          }}
        />
      </div>

      {/* Loading message */}
      <div
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 19,
          fontStyle: "italic",
          color: C.accent,
          textAlign: "center",
          minHeight: 30,
          opacity,
          transition: "opacity 0.35s",
        }}
      >
        {current[0]}
      </div>

      {/* Sub-step */}
      <div
        style={{
          marginTop: 10,
          fontFamily: "'EB Garamond',serif",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: `rgba(176,169,159,0.25)`,
          textAlign: "center",
          opacity,
          transition: "opacity 0.35s",
        }}
      >
        {current[1]}
      </div>
    </div>
  );
}
