/**
 * Toolbar: add root/action nodes, delete selection, export/import JSON.
 * Programmatic diagram state can be saved or loaded for version control.
 */

import { useRef } from "react";
import type { DiagramState } from "./types";

type FlowToolbarProps = {
  onAddRoot: () => void;
  onAddAction: () => void;
  onAddGateway: () => void;
  onAddRegistry: () => void;
  onAddGroup: () => void;
  onAddResolver: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onExport: () => DiagramState;
  onImport: (state: DiagramState) => void;
};

export function FlowToolbar({
  onAddRoot,
  onAddAction,
  onAddGateway,
  onAddRegistry,
  onAddGroup,
  onAddResolver,
  onDeleteSelected,
  hasSelection,
  onExport,
  onImport,
}: FlowToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const state = onExport();
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const state = JSON.parse(reader.result as string) as DiagramState;
        if (state.nodes && Array.isArray(state.nodes) && state.edges && Array.isArray(state.edges)) {
          onImport(state);
        }
      } catch (_) {
        console.error("Invalid diagram JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--diagram-ink)] bg-[var(--diagram-node-bg)]">
      <button
        type="button"
        onClick={onAddRoot}
        className="px-3 py-1.5 rounded border-2 border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-sm hover:bg-[var(--diagram-paper)]"
      >
        + Root
      </button>
      <button
        type="button"
        onClick={onAddAction}
        className="px-3 py-1.5 rounded-full border-2 border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-sm hover:bg-[var(--diagram-paper)]"
      >
        + Action
      </button>
      <button
        type="button"
        onClick={onAddGateway}
        className="px-2 py-1.5 border-2 border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-xs hover:bg-[var(--diagram-paper)]"
        title="Diamond gateway (e.g. eth.limo)"
      >
        + Gateway
      </button>
      <button
        type="button"
        onClick={onAddRegistry}
        className="px-2 py-1.5 rounded-full border-2 border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-xs hover:bg-[var(--diagram-paper)]"
        title="Registry/Storage (e.g. ENS, IPFS)"
      >
        + Registry
      </button>
      <button
        type="button"
        onClick={onAddGroup}
        className="px-2 py-1.5 rounded border-2 border-dashed border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-xs hover:bg-[var(--diagram-paper)]"
        title="Group (dotted container)"
      >
        + Group
      </button>
      <button
        type="button"
        onClick={onAddResolver}
        className="px-2 py-1.5 rounded border-2 border-[var(--diagram-ink-brown)] text-[var(--diagram-ink-brown)] font-mono text-xs hover:bg-[var(--diagram-node-bg-brown)]"
        title="Resolver (brown, owner + addr)"
      >
        + Resolver
      </button>
      <button
        type="button"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className="px-3 py-1.5 rounded border-2 border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-sm hover:bg-[var(--diagram-paper)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Delete
      </button>
      <span className="w-px h-5 bg-[var(--diagram-ink)] opacity-50" />
      <button
        type="button"
        onClick={handleExport}
        className="px-3 py-1.5 rounded border border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-sm hover:bg-[var(--diagram-paper)]"
      >
        Export JSON
      </button>
      <button
        type="button"
        onClick={handleImport}
        className="px-3 py-1.5 rounded border border-[var(--diagram-ink)] text-[var(--diagram-ink)] font-mono text-sm hover:bg-[var(--diagram-paper)]"
      >
        Import JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={onFileChange}
        aria-label="Import diagram JSON"
        title="Import diagram JSON"
      />
    </div>
  );
}
