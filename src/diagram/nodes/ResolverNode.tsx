/**
 * Resolver node — brown, dotted border, owner + addr (60). Figma diagram style.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { ResolverNodeData } from "../types";
import CornerMarkers from "./CornerMarkers";

export type ResolverNodeType = Node<ResolverNodeData, "resolver">;

function ResolverNode({ data, selected }: NodeProps<ResolverNodeType>) {
  return (
    <div
      className={`
        diagram-resolver diagram-node-dotted min-w-[140px] border-2 px-4 py-3 relative
        bg-[var(--diagram-node-bg-brown)] text-[var(--diagram-ink-brown)]
        border-[var(--diagram-ink-brown)]
        ${selected ? "ring-2 ring-[var(--diagram-ink-brown)] ring-offset-2 ring-offset-[var(--diagram-paper)]" : ""}
      `}
      style={{ borderRadius: "var(--diagram-node-radius)" }}
    >
      <CornerMarkers variant="brown" />
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)] !border-[var(--diagram-ink-brown)]" />
      <div className="font-bold text-[var(--diagram-font-main)] leading-tight underline">{data.label}</div>
      {data.owner != null && data.owner !== "" && (
        <div className="mt-0.5 text-[var(--diagram-font-sub)] font-normal opacity-90">owner: {data.owner}</div>
      )}
      {data.addr != null && data.addr !== "" && (
        <div className="mt-0.5 text-[var(--diagram-font-sub)] font-normal opacity-90">addr (60): {data.addr}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)] !border-[var(--diagram-ink-brown)]" />
    </div>
  );
}

export default memo(ResolverNode);