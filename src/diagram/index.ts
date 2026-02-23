/**
 * Diagram builder: canvas editor with programmatic data model.
 * Build flow diagrams (root entities + action pills); export/import JSON.
 */

export { FlowCanvas } from "./FlowCanvas";
export { FlowToolbar } from "./FlowToolbar";
export { nodeTypes } from "./nodes";
export type {
  DiagramState,
  DiagramNode,
  DiagramEdge,
  DiagramVariant,
  RootNodeData,
  ActionNodeData,
  GatewayNodeData,
  RegistryNodeData,
  GroupNodeData,
  ResolverNodeData,
} from "./types";
