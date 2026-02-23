/**
 * Action node: pill (e.g. eth, montoya.eth), dotted border, corner markers. Figma 1153:571.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { ActionNodeData } from "../types";
import CornerMarkers from "./CornerMarkers";

export type ActionNodeType = Node<ActionNodeData, "action">;

function ActionNode({ data, selected }: NodeProps<ActionNodeType>) {
  const variant = data.variant ?? "blue";
  const isBrown = variant === "brown";
  const bg = isBrown ? "var(--diagram-node-bg-brown)" : "var(--diagram-node-bg)";
  const ink = isBrown ? "var(--diagram-ink-brown)" : "var(--diagram-ink)";
  const ring = selected ? (isBrown ? "ring-2 ring-[var(--diagram-ink-brown)]" : "ring-2 ring-[var(--diagram-ink)]") : "";

  return (
    <div
      className={`
        diagram-action diagram-node-dotted rounded-full border-2 px-4 py-2 relative whitespace-nowrap
        text-[var(--diagram-font-main)] font-semibold
        ${selected ? `${ring} ring-offset-2 ring-offset-[var(--diagram-paper)]` : ""}
      `}
      style={{ background: bg, color: ink, borderColor: ink }}
    >
      <CornerMarkers variant={variant} />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)]" style={{ borderColor: ink }} />
      <span className="underline">{data.label}</span>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)]" style={{ borderColor: ink }} />
    </div>
  );
}

export default memo(ActionNode);
