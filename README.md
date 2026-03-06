# ENSIP-25 Agent Registry Attestation

A tool for verifying and managing bidirectional attestations between ENS names and AI agents registered in [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent registries, as specified by [ENSIP-25](https://docs.ens.domains/ensip/25).

## What it does

Given an ENS name, an agent ID, and a registry, the tool:

1. **ENS → Agent** — Resolves the ENS text record to check whether the name owner attests to the agent.
2. **Agent → ENS** — Fetches the agent's registration file from the ERC-8004 registry (via `tokenURI`) to check whether the agent points back to the ENS name.
3. **Verification status** — Reports the bidirectional verification loop: both directions confirmed, one-way only, or no attestation.
4. **Write attestation** — Allows setting or removing the attestation text record directly via a connected wallet.

## Features

- **Bidirectional attestation verification** — checks both the ENS text record and the agent registration file to confirm a two-way link.
- **Multi-chain support** — Ethereum Mainnet, Ethereum Sepolia, Base Mainnet, and Base Sepolia registries.
- **ERC-7930 encoded registry address display** — shows the full interop address encoding for each registry.
- **Agent file resolution** — resolves `data:`, `ipfs://`, and `https://` URIs returned by `tokenURI`, then parses the agent file for ENS endpoint declarations.
- **Wallet-based text record management** — set or remove the attestation text record via a connected wallet (RainbowKit).
- **Permission check via tx simulation** — simulates `setText` on the resolver to verify the connected wallet can manage the name before exposing write controls.
- **Auto re-resolve after tx confirmation** — re-runs verification automatically once a set/remove transaction is confirmed.
- **ENS avatar display** — shows the ENS avatar alongside verification results.

## Supported registries

| Label | Chain ID | Contract address |
| --- | --- | --- |
| 8004 @ Ethereum Mainnet | 1 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| 8004 @ Ethereum Sepolia | 11155111 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| 8004 @ Base Mainnet | 8453 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| 8004 @ Base Sepolia | 84532 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |

## Getting started

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
```

Run tests:

```sh
npx vitest run
```

## Tech stack

React, TypeScript, Vite, viem, wagmi, RainbowKit, Tailwind CSS v4, Vitest

## Deployment

Deployed on Netlify. Build command: `npm run build`, publish directory: `dist`.
