/**
 * Group node: dotted rounded rect for logical grouping (e.g. "Authorship & Update Control").
 * Visual container only; place other nodes inside it by layout.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { GroupNodeData } from "../types";

export type GroupNodeType = Node<GroupNodeData, "group">;

function GroupNode({ data, selected }: NodeProps<GroupNodeType>) {
  return (
    <div
      className={`
        diagram-group min-w-[180px] min-h-[100px] rounded-[var(--diagram-node-radius)] border-2 border-dotted px-4 py-3
        bg-transparent text-[var(--diagram-ink)]
        border-[var(--diagram-ink)]
        ${selected ? "ring-2 ring-[var(--diagram-ink)] ring-offset-2 ring-offset-[var(--diagram-paper)]" : ""}
      `}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)] !border-[var(--diagram-ink)]" />
      <div className="text-[var(--diagram-font-sub)] font-normal opacity-90">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-2 !bg-[var(--diagram-paper)] !border-[var(--diagram-ink)]" />
    </div>
  );
}

export default memo(GroupNode);