/**
 * Flow diagram canvas: programmatic data (nodes/edges state) + canvas editing.
 * - Drag nodes, connect handles, add/remove nodes via toolbar.
 * - Export/import JSON for version control and code-based generation.
 */

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import type { DiagramNode, DiagramEdge, DiagramState } from "./types";
import { FlowToolbar } from "./FlowToolbar";
import DiagramNoiseOverlay from "./DiagramNoiseOverlay";

/* Figma 1153:571 — <root> → eth → Resolver 1 / montoya.eth → domingo.montoya.eth / Resolver 2 */
const initialNodes: DiagramNode[] = [
  { id: "root", type: "root", position: { x: 280, y: 24 }, data: { label: "<root>", owner: "0x0123...", variant: "blue" } },
  { id: "eth", type: "action", position: { x: 280, y: 120 }, data: { label: "eth", variant: "blue" } },
  { id: "resolver1", type: "resolver", position: { x: 80, y: 220 }, data: { label: "Resolver 1", owner: "0x5678..", addr: "0-5678.." } },
  { id: "montoya-eth", type: "action", position: { x: 280, y: 220 }, data: { label: "montoya.eth", variant: "brown" } },
  { id: "domingo", type: "root", position: { x: 280, y: 340 }, data: { label: "domingo.montoya.eth", owner: "90AB...", variant: "blue" } },
  { id: "resolver2", type: "resolver", position: { x: 480, y: 340 }, data: { label: "Resolver 2", owner: "0x7890..", addr: "0x7890." } },
];

const initialEdges: DiagramEdge[] = [
  { id: "e-root-eth", source: "root", target: "eth", label: "eth" },
  { id: "e-eth-r1", source: "eth", target: "resolver1", label: "montoya" },
  { id: "e-eth-m", source: "eth", target: "montoya-eth", label: "montoya" },
  { id: "e-m-domingo", source: "montoya-eth", target: "domingo" },
  { id: "e-m-r2", source: "montoya-eth", target: "resolver2", label: "inigo" },
];

export function FlowCanvas() {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  const onNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<DiagramEdge>[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: DiagramNode[] }) => {
    setSelectedNodeIds(new Set(selected.map((n) => n.id)));
  }, []);

  const addRoot = useCallback(() => {
    const id = `root-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "root",
        position: { x: 100 + (nds.length % 4) * 180, y: 80 + Math.floor(nds.length / 4) * 120 },
        data: { label: "<root>", owner: "" },
      },
    ]);
  }, [setNodes]);

  const addAction = useCallback(() => {
    const id = `action-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "action",
        position: { x: 120 + (nds.length % 4) * 180, y: 200 + Math.floor(nds.length / 4) * 100 },
        data: { label: "label" },
      },
    ]);
  }, [setNodes]);

  const addGateway = useCallback(() => {
    const id = `gateway-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "gateway",
        position: { x: 80 + (nds.length % 4) * 160, y: 120 + Math.floor(nds.length / 4) * 140 },
        data: { label: "GATEWAY", id: "" },
      },
    ]);
  }, [setNodes]);

  const addRegistry = useCallback(() => {
    const id = `registry-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "registry",
        position: { x: 100 + (nds.length % 4) * 180, y: 180 + Math.floor(nds.length / 4) * 120 },
        data: { label: "REGISTRY", subtitle: "" },
      },
    ]);
  }, [setNodes]);

  const addGroup = useCallback(() => {
    const id = `group-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "group",
        position: { x: 60 + (nds.length % 3) * 220, y: 80 + Math.floor(nds.length / 3) * 160 },
        data: { label: "Group label" },
      },
    ]);
  }, [setNodes]);

  const addResolver = useCallback(() => {
    const id = `resolver-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "resolver",
        position: { x: 100 + (nds.length % 3) * 200, y: 180 + Math.floor(nds.length / 3) * 140 },
        data: { label: "Resolver", owner: "", addr: "" },
      },
    ]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    if (selectedNodeIds.size === 0) return;
    setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));
    setEdges((eds) =>
      eds.filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target))
    );
    setSelectedNodeIds(new Set());
  }, [selectedNodeIds, setNodes, setEdges]);

  const exportDiagram = useCallback((): DiagramState => {
    return {
      nodes: nodes as DiagramNode[],
      edges: edges as DiagramEdge[],
    };
  }, [nodes, edges]);

  const importDiagram = useCallback((state: DiagramState) => {
    setNodes(state.nodes);
    setEdges(state.edges);
  }, [setNodes, setEdges]);

  return (
    <div className="diagram-canvas flex flex-col h-full w-full bg-[var(--diagram-paper)]">
      <FlowToolbar
        onAddRoot={addRoot}
        onAddAction={addAction}
        onAddGateway={addGateway}
        onAddRegistry={addRegistry}
        onAddGroup={addGroup}
        onAddResolver={addResolver}
        onDeleteSelected={deleteSelected}
        hasSelection={selectedNodeIds.size > 0}
        onExport={exportDiagram}
        onImport={importDiagram}
      />
      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          className="diagram-flow"
          snapToGrid
          snapGrid={[12, 12]}
          defaultEdgeOptions={{
            style: { stroke: "var(--diagram-ink)", strokeWidth: 2 },
            type: "smoothstep",
            labelShowBg: true,
            labelBgStyle: { fill: "var(--diagram-node-bg)", stroke: "var(--diagram-ink)", strokeWidth: 1.5 },
            labelBgPadding: [8, 12] as [number, number],
            labelBgBorderRadius: 10,
            labelStyle: {
              fontFamily: "ui-monospace, monospace",
              fontWeight: 600,
              fontSize: "var(--diagram-font-sub)",
              fill: "var(--diagram-ink)",
            },
          }}
        >
          <Background
            color="var(--diagram-grid)"
            gap={16}
            size={1}
            style={{ backgroundColor: "var(--diagram-paper)" }}
          />
          <Controls
            className="!border-[var(--diagram-ink)] !bg-[var(--diagram-node-bg)] !fill-[var(--diagram-ink)]"
            showInteractive={false}
          />
          <MiniMap
            nodeColor="var(--diagram-ink)"
            maskColor="rgba(0,0,0,0.1)"
            className="!bg-[var(--diagram-node-bg)] !border-[var(--diagram-ink)]"
          />
        </ReactFlow>
        <DiagramNoiseOverlay />
      </div>
    </div>
  );
}
