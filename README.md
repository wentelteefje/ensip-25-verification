# ENSIP-25 Agent Registry Attestation

A tool for verifying and managing ENS text-record attestations between ENS names and AI agents registered in ERC-8004 agent registries.

Given an ENS name and an agent ID, the app:

1. Resolves the ENS text record to check whether the name owner attests to the agent (ENS -> Agent).
2. Fetches the agent file from the registry contract to check whether the agent points back to the ENS name (Agent -> ENS).
3. Reports the bidirectional verification loop status.
4. Allows setting or removing the attestation text record directly via a connected wallet.

## Getting Started

```sh
npm install
npm run dev
```

## Running Tests

Unit tests cover the extracted attestation logic (text-record key construction, agent-file URI parsing, ENS endpoint extraction, verification status):

```sh
npx vitest run
```

Watch mode:

```sh
npx vitest
```

## Build

```sh
npm run build
```

## Tech Stack

- React + TypeScript + Vite
- viem for Ethereum reads
- wagmi + RainbowKit for wallet connection and write transactions
- Tailwind CSS v4
- Vitest for unit tests
