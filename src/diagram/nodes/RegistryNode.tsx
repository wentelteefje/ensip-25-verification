/**
 * Registry/Storage node: oval with title + optional subtitle (e.g. ONCHAIN NAME REGISTRY / ENS).
 * Use for resolution path and deployment pipeline diagrams.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { RegistryNodeData } from "../types";

export type RegistryNodeType = Node<RegistryNodeData, "registry">;

function RegistryNode({ data, selected }: NodeProps<RegistryNodeType>) {
  return (
    <div
      className={`
        diagram-registry rounded-full min-w-[120px] border-2 px-4 py-3
        bg-[var(--diagram-node-bg)] text-[var(--diagram-ink)]
        border-[var(--diagram-ink)]
        ${selected ? "ring-2 ring-[var(--diagram-ink)] ring-offset-2 ring-offset-[var(--diagram-paper)]" : ""}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)] !border-[var(--diagram-ink)]" />
      <div className="font-bold text-[var(--diagram-font-main)] leading-tight">{data.label}</div>
      {data.subtitle != null && data.subtitle !== "" && (
        <div className="text-[var(--diagram-font-sub)] font-normal opacity-85 mt-0.5">{data.subtitle}</div>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)] !border-[var(--diagram-ink)]" />
    </div>
  );
}

export default memo(RegistryNode);