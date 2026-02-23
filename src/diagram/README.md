# Diagram builder

**Hybrid approach:** programmatic data (nodes + edges as state/JSON) with a **canvas editor** for layout and connections.

- **Canvas:** drag nodes, connect handles, pan/zoom, grid snap. Toolbar: add nodes by type, delete selection, Export/Import JSON.
- **Programmatic:** diagram is plain data. Export JSON for version control; import to restore or generate from code.

## Node types

- **Root** — Rounded rect: `<root>` + optional `owner` (e.g. `0x0123...`). Handles top/bottom. Entity/state.
- **Action** — Pill: single label (e.g. `eth`, `@ UPLOAD`). Handles left/right. Flow steps.
- **Gateway** — Diamond: label + optional id (e.g. "REPLACEABLE GATEWAY" / `eth.limo`). Resolution & serving path.
- **Registry** — Oval: label + optional subtitle (e.g. "ONCHAIN NAME REGISTRY" / ENS). Handles left/right.
- **Group** — Dotted rounded rect: label only (e.g. "Authorship & Update Control"). Visual grouping.

## Edge labels

Edges support a `label` property (e.g. `"2. UPLOAD"`, `"resolve name"`). Set in JSON or via `updateEdge(id, { label: "..." })`.

## Example use cases

- **Deployment pipeline:** Builder/Signer → Omnipin → IPFS (UPLOAD, RETURN CID) → Filecoin (PERSIST) → Safe → ENS. Use Root, Action, Registry, Group.
- **Resolution & serving path:** User → Gateway (eth.limo) → Registry (ENS) → Gateway → Storage (Filecoin) → Gateway → User. Use Gateway + Registry; label edges e.g. "visit example.eth", "resolve name", "content hash [CID]", "HTTP response".

## Usage

- **+ Root** / **+ Action** / **+ Gateway** / **+ Registry** / **+ Group** — add nodes.
- Drag from a handle to another to connect. Select nodes then **Delete**.
- **Export JSON** / **Import JSON** — full state including edge labels.

Theme: blueprint (light blue paper, grid, dark blue ink). CSS variables in `index.css` under `.diagram-canvas`.
