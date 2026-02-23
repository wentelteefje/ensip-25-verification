/**
 * Four corner dots on a node — Figma "corner nodes": blue on blue nodes, brown on brown.
 */

import { memo } from "react";
import type { DiagramVariant } from "../types";

const dotClass = "absolute w-1.5 h-1.5 rounded-full pointer-events-none";
const cornerPos = "translate-x-[-3px] translate-y-[-3px]";

function CornerMarkers({ variant = "blue" }: { variant?: DiagramVariant }) {
  const bg = variant === "brown" ? "var(--diagram-corner-brown)" : "var(--diagram-corner-blue)";
  return (
    <>
      <span className={`${dotClass} top-0 left-0 ${cornerPos}`} style={{ background: bg }} />
      <span className={`${dotClass} top-0 right-0 ${cornerPos}`} style={{ background: bg }} />
      <span className={`${dotClass} bottom-0 right-0 ${cornerPos}`} style={{ background: bg }} />
      <span className={`${dotClass} bottom-0 left-0 ${cornerPos}`} style={{ background: bg }} />
    </>
  );
}

export default memo(CornerMarkers);
