/**
 * Pure helper functions for agent-registry attestation logic.
 * Extracted from InteropAddress.tsx for testability.
 */

// --- Types -----------------------------------------------------------------

export type AgentFileResult =
  | { type: "valid"; endpoint: string }
  | { type: "invalid"; endpoint: string }
  | { type: "not-set" }
  | { type: "error"; message: string };

// --- Functions -------------------------------------------------------------

/** Build the ENS text-record key for an agent attestation. */
export function buildTextRecordKey(registryValue: string, agentId: string): string {
  return `agent-registration[${registryValue}][${agentId}]`;
}

/**
 * Resolve an agent-file URI (data:, ipfs://, https://) to its raw text content.
 * Throws on fetch failures or non-OK responses.
 */
export async function parseAgentFileUri(uri: string, signal?: AbortSignal): Promise<string> {
  if (uri.startsWith("data:")) {
    const commaIdx = uri.indexOf(",");
    const meta = uri.slice(5, commaIdx);
    const payload = uri.slice(commaIdx + 1);
    if (meta.includes("base64")) {
      return atob(payload);
    }
    return decodeURIComponent(payload);
  }

  if (uri.startsWith("ipfs://")) {
    const cid = uri.slice(7);
    const resp = await fetch(`https://ipfs.io/ipfs/${cid}`, { signal });
    if (!resp.ok) throw new Error(`Agent file fetch failed (${String(resp.status)})`);
    return resp.text();
  }

  // https / http
  const resp = await fetch(uri, { signal });
  if (!resp.ok) throw new Error(`Agent file fetch failed (${String(resp.status)})`);
  return resp.text();
}

/**
 * Parse an ERC-8004 agent registration file and extract the ENS service
 * endpoint. Per the spec the array is `services` and the entry name is
 * exactly `"ENS"`.
 * Returns `null` if the JSON is malformed, has no `services` array,
 * or has no `ENS` entry.
 */
export function extractEnsEndpoint(jsonText: string): string | null {
  // Guard against non-JSON content
  const trimmed = jsonText.trimStart();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as { services?: unknown[] };
    const services: unknown[] = parsed?.services ?? [];
    const ensService = services.find(
      (s: unknown) =>
        typeof s === "object" &&
        s !== null &&
        "name" in s &&
        (s as { name: string }).name === "ENS",
    ) as { name: string; endpoint?: string } | undefined;

    return ensService?.endpoint ?? null;
  } catch {
    return null;
  }
}

/**
 * Compare the agent-file ENS endpoint to the queried ENS name.
 * Case-insensitive comparison.
 */
export function checkAgentFile(endpoint: string | null, ensName: string): AgentFileResult {
  if (endpoint === null) {
    return { type: "not-set" };
  }
  const matches = endpoint.toLowerCase() === ensName.toLowerCase();
  return matches
    ? { type: "valid", endpoint }
    : { type: "invalid", endpoint };
}

/**
 * Derive the human-readable verification-loop status from the two
 * directional booleans.
 */
export function getVerificationStatus(
  ensToAgent: boolean,
  agentToEns: boolean,
): { label: string; closed: boolean } {
  const closed = ensToAgent && agentToEns;
  if (closed) {
    return { label: "Closed — verified in both directions", closed: true };
  }
  if (ensToAgent) {
    return { label: "ENS → Agent only", closed: false };
  }
  if (agentToEns) {
    return { label: "Agent → ENS only", closed: false };
  }
  return { label: "Open — no verification in either direction", closed: false };
}
