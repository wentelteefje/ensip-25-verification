/**
 * Full-cover noise overlay for hand-drawn blueprint feel.
 * Uses SVG feTurbulence; pointer-events-none so the canvas stays interactive.
 */

import { memo } from "react";

function DiagramNoiseOverlay() {
  return (
    <div
      className="diagram-noise-overlay pointer-events-none absolute inset-0 z-10"
      aria-hidden
    >
      <svg width="100%" height="100%" preserveAspectRatio="none" className="block size-full">
        <defs>
          <filter id="diagram-noise" x="0" y="0">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0.35  0 0 0 0 0.45  0 0 0 0 0.55  0 0 0 0.18 0"
              result="grain"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="transparent" filter="url(#diagram-noise)" />
      </svg>
    </div>
  );
}

export default memo(DiagramNoiseOverlay);
