import { describe, it, expect, vi } from "vitest";
import {
  buildTextRecordKey,
  parseAgentFileUri,
  extractEnsEndpoint,
  checkAgentFile,
  getVerificationStatus,
} from "./attestation.ts";

// ---------------------------------------------------------------------------
// buildTextRecordKey
// ---------------------------------------------------------------------------

describe("buildTextRecordKey", () => {
  it("formats the key correctly", () => {
    expect(
      buildTextRecordKey("0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432", "26433"),
    ).toBe("agent-registration[0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432][26433]");
  });
});

// ---------------------------------------------------------------------------
// parseAgentFileUri
// ---------------------------------------------------------------------------

describe("parseAgentFileUri", () => {
  it("decodes data: base64 URIs", async () => {
    const json = JSON.stringify({ hello: "world" });
    const b64 = btoa(json);
    const uri = `data:application/json;base64,${b64}`;
    expect(await parseAgentFileUri(uri)).toBe(json);
  });

  it("decodes data: raw (percent-encoded) URIs", async () => {
    const json = '{"a":1}';
    const uri = `data:application/json,${encodeURIComponent(json)}`;
    expect(await parseAgentFileUri(uri)).toBe(json);
  });

  it("rewrites ipfs:// to gateway URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"services":[]}'),
    });
    vi.stubGlobal("fetch", mockFetch);

    await parseAgentFileUri("ipfs://QmFoo123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://ipfs.io/ipfs/QmFoo123",
      expect.objectContaining({}),
    );

    vi.unstubAllGlobals();
  });

  it("fetches https:// URIs directly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("content"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await parseAgentFileUri("https://example.com/agent.json");
    expect(result).toBe("content");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/agent.json",
      expect.objectContaining({}),
    );

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// extractEnsEndpoint
// ---------------------------------------------------------------------------

describe("extractEnsEndpoint", () => {
  it("returns endpoint when ENS service exists in services array", () => {
    const json = JSON.stringify({
      services: [{ name: "ENS", endpoint: "alice.eth" }],
    });
    expect(extractEnsEndpoint(json)).toBe("alice.eth");
  });

  it("ignores non-standard endpoints array", () => {
    const json = JSON.stringify({
      endpoints: [{ name: "ENS", endpoint: "workemon.eth" }],
    });
    expect(extractEnsEndpoint(json)).toBeNull();
  });

  it("requires exact case match for ENS name", () => {
    const json = JSON.stringify({
      services: [{ name: "ens", endpoint: "bob.eth" }],
    });
    expect(extractEnsEndpoint(json)).toBeNull();
  });

  it("returns null when ENS entry is missing", () => {
    const json = JSON.stringify({
      services: [{ name: "DNS", endpoint: "example.com" }],
    });
    expect(extractEnsEndpoint(json)).toBeNull();
  });

  it("returns null when services is empty", () => {
    expect(extractEnsEndpoint(JSON.stringify({ services: [] }))).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(extractEnsEndpoint("not json at all")).toBeNull();
  });

  it("returns null for non-JSON content (HTML)", () => {
    expect(extractEnsEndpoint("<html><body>Error</body></html>")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkAgentFile
// ---------------------------------------------------------------------------

describe("checkAgentFile", () => {
  it("returns valid for case-insensitive match", () => {
    expect(checkAgentFile("Alice.ETH", "alice.eth")).toEqual({
      type: "valid",
      endpoint: "Alice.ETH",
    });
  });

  it("returns invalid for mismatch", () => {
    expect(checkAgentFile("bob.eth", "alice.eth")).toEqual({
      type: "invalid",
      endpoint: "bob.eth",
    });
  });

  it("returns not-set when endpoint is null", () => {
    expect(checkAgentFile(null, "alice.eth")).toEqual({ type: "not-set" });
  });
});

// ---------------------------------------------------------------------------
// getVerificationStatus
// ---------------------------------------------------------------------------

describe("getVerificationStatus", () => {
  it("returns closed when both directions verified", () => {
    expect(getVerificationStatus(true, true)).toEqual({
      label: "Closed — verified in both directions",
      closed: true,
    });
  });

  it("returns ENS → Agent only", () => {
    expect(getVerificationStatus(true, false)).toEqual({
      label: "ENS → Agent only",
      closed: false,
    });
  });

  it("returns Agent → ENS only", () => {
    expect(getVerificationStatus(false, true)).toEqual({
      label: "Agent → ENS only",
      closed: false,
    });
  });

  it("returns open when neither direction verified", () => {
    expect(getVerificationStatus(false, false)).toEqual({
      label: "Open — no verification in either direction",
      closed: false,
    });
  });
});
