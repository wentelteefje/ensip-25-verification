/**
 * Root node: rounded rect, dotted border, corner markers. Main label underlined, owner below. Figma 1153:571.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { RootNodeData } from "../types";
import CornerMarkers from "./CornerMarkers";

export type RootNodeType = Node<RootNodeData, "root">;

function RootNode({ data, selected }: NodeProps<RootNodeType>) {
  const label = data.label ?? "<root>";
  const owner = data.owner;
  const variant = data.variant ?? "blue";
  const isBrown = variant === "brown";
  const bg = isBrown ? "var(--diagram-node-bg-brown)" : "var(--diagram-node-bg)";
  const ink = isBrown ? "var(--diagram-ink-brown)" : "var(--diagram-ink)";
  const ring = selected ? (isBrown ? "ring-2 ring-[var(--diagram-ink-brown)]" : "ring-2 ring-[var(--diagram-ink)]") : "";

  return (
    <div
      className={`
        diagram-root diagram-node-dotted min-w-[140px] border-2 px-4 py-3 relative
        text-[var(--diagram-font-main)]
        ${selected ? `${ring} ring-offset-2 ring-offset-[var(--diagram-paper)]` : ""}
      `}
      style={{ borderRadius: "var(--diagram-node-radius)", background: bg, color: ink, borderColor: ink }}
    >
      <CornerMarkers variant={variant} />
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)]" style={{ borderColor: ink }} />
      <div className="font-bold leading-tight underline">{label}</div>
      {owner != null && owner !== "" && (
        <div className="mt-0.5 text-[var(--diagram-font-sub)] font-normal opacity-90">owner: {owner}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)]" style={{ borderColor: ink }} />
    </div>
  );
}

export default memo(RootNode);
