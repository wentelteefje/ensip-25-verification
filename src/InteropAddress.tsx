/**
 * InteropAddress — Agent Registry Attestation lookup tool.
 * Looks up ENS text records to verify whether an ENS name owner attests
 * to an AI agent registered in an ERC-8004 agent registry.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { useScramble } from "use-scramble";
import { createPublicClient, http, namehash, type Chain, type PublicClient } from "viem";
import { normalize } from "viem/ens";
import { mainnet, sepolia, base, baseSepolia } from "viem/chains";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import {
  buildTextRecordKey,
  parseAgentFileUri,
  extractEnsEndpoint,
  checkAgentFile,
  type AgentFileResult,
} from "./lib/attestation.ts";

// --- viem clients ----------------------------------------------------------

// Map any chain to the ENS-capable chain it belongs to.
// Mainnets (1, 8453) → Ethereum mainnet; testnets (11155111, 84532) → Sepolia.
const TESTNET_CHAIN_IDS = new Set([11155111, 84532]);

function getEnsClient(registryChainId?: number): PublicClient {
  const ensChainId = registryChainId && TESTNET_CHAIN_IDS.has(registryChainId) ? 11155111 : 1;
  return getClient(ensChainId);
}

const chainConfigs: Record<number, { chain: Chain; rpc: string }> = {
  1: { chain: mainnet, rpc: "https://eth.drpc.org" },
  11155111: { chain: sepolia, rpc: "https://sepolia.drpc.org" },
  8453: { chain: base, rpc: "https://base.drpc.org" },
  84532: { chain: baseSepolia, rpc: "https://base-sepolia.drpc.org" },
};

const clientCache = new Map<number, PublicClient>();

function getClient(chainId: number): PublicClient {
  let c = clientCache.get(chainId);
  if (c) return c;
  const cfg = chainConfigs[chainId];
  if (!cfg) throw new Error(`Unsupported chainId: ${String(chainId)}`);
  c = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });
  clientCache.set(chainId, c);
  return c;
}

// --- Registry data ---------------------------------------------------------

interface Registry {
  label: string;
  value: string;
  contractAddress: `0x${string}`;
  chainId: number;
}

const REGISTRIES: Registry[] = [
  {
    label: "8004 @ Ethereum Mainnet",
    value: "0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432",
    contractAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    chainId: 1,
  },
  {
    label: "8004 @ Ethereum Sepolia",
    value: "0x0001000003aa36a7148004a818bfb912233c491871b3d84c89a494bd9e",
    contractAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 11155111,
  },
  {
    label: "8004 @ Base Mainnet",
    value: "0x00010000022105148004a169fb4a3325136eb29fa0ceb6d2e539a432",
    contractAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    chainId: 8453,
  },
  {
    label: "8004 @ Base Sepolia",
    value: "0x0001000003014a34148004a818bfb912233c491871b3d84c89a494bd9e",
    contractAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
  },
];

// --- ABI fragments ---------------------------------------------------------

const agentRegistryAbi = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const resolverAbi = [
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
] as const;

// ENS registry contracts per chain for resolver lookups
const ensRegistryAbi = [
  {
    name: "resolver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const ENS_REGISTRY: Record<number, `0x${string}`> = {
  1: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  11155111: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
};

// --- Animation config -----------------------------------------------------

const AC = {
  FAST: 0.2,
  NORMAL: 0.3,
  SLOW: 0.4,
  EASE: [0.22, 1, 0.36, 1] as const,
} as const;

const resultVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 12,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: AC.FAST, ease: AC.EASE },
  },
};

const buttonVariants: Variants = {
  idle: {
    scale: 1,
    transition: { duration: AC.NORMAL, ease: AC.EASE },
  },
  active: {
    scale: 1.05,
    transition: { duration: AC.FAST, ease: AC.EASE },
  },
};

/* Inline SVG icons */
const ICON_SIZE = 24;
type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

function IconPlay({ size = ICON_SIZE, className = "", style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 11 14" fill="currentColor" aria-hidden>
      <path d="M0 14V0L11 7L0 14ZM2 10.35L7.25 7L2 3.65V10.35Z" />
    </svg>
  );
}
function IconCopy({ size = ICON_SIZE, className = "", style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 10 12" fill="currentColor" aria-hidden>
      <path d="M3.18 9C2.88 9 2.625 8.895 2.415 8.685C2.205 8.475 2.1 8.22 2.1 7.92V1.08C2.1 0.78 2.205 0.525 2.415 0.315C2.625 0.105 2.88 0 3.18 0H8.22C8.52 0 8.775 0.105 8.985 0.315C9.195 0.525 9.3 0.78 9.3 1.08V7.92C9.3 8.22 9.195 8.475 8.985 8.685C8.775 8.895 8.52 9 8.22 9H3.18ZM3.18 8.1H8.22C8.26 8.1 8.3 8.08 8.34 8.04C8.38 8 8.4 7.96 8.4 7.92V1.08C8.4 1.04 8.38 1 8.34 0.96C8.3 0.92 8.26 0.9 8.22 0.9H3.18C3.14 0.9 3.1 0.92 3.06 0.96C3.02 1 3 1.04 3 1.08V7.92C3 7.96 3.02 8 3.06 8.04C3.1 8.08 3.14 8.1 3.18 8.1ZM1.08 11.1C0.78 11.1 0.525 10.995 0.315 10.785C0.105 10.575 0 10.32 0 10.02V2.28H0.9V10.02C0.9 10.06 0.92 10.1 0.96 10.14C1 10.18 1.04 10.2 1.08 10.2H7.02V11.1H1.08ZM3 8.1V7.92C3 7.96 3 8 3 8.04C3 8.08 3 8.1 3 8.1Z" />
    </svg>
  );
}
function IconCheck({ size = ICON_SIZE, className = "", style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

const dotVariants: Variants = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};

/* Scroll-in-view orchestrated enter — header → input → output */
const scrollEnterVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const scrollEnterItemVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: AC.EASE },
  },
};

// --- Resolution -----------------------------------------------------------

type ResolveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "resolved"; textRecordKey: string; textRecordValue: string; registryAddress: string; agentFileResult?: AgentFileResult; ensAvatar?: string }
  | { status: "no-attestation"; textRecordKey: string; registryAddress: string; agentFileResult?: AgentFileResult; ensAvatar?: string }
  | { status: "error"; message: string };

// --- Color palette --------------------------------------------------------

type ColorTheme = "citrine" | "peridot" | "magenta" | "azure";

const COLOR_THEMES: ColorTheme[] = ["citrine", "peridot", "magenta", "azure"];

function getRandomColor(): ColorTheme {
  return COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)];
}

// --- Component ------------------------------------------------------------

export default function InteropAddress() {
  const [ensName, setEnsName] = useState("ens-registration-agent.ses.eth");
  const [agentId, setAgentId] = useState("26433");
  const [registry, setRegistry] = useState<Registry>(REGISTRIES[0]);
  const [state, setState] = useState<ResolveState>({ status: "idle" });
  const [colorTheme] = useState<ColorTheme>(getRandomColor);
  const abortRef = useRef<AbortController | null>(null);

  // Wallet state for setText
  const { isConnected, chainId: walletChainId } = useAccount();
  const { writeContract, data: txHash, isPending: isTxPending, reset: resetTx } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const { switchChain } = useSwitchChain();

  // The ENS chain writes must target (mainnet or Sepolia, derived from registry)
  const requiredEnsChainId = TESTNET_CHAIN_IDS.has(registry.chainId) ? 11155111 : 1;
  const isWrongChain = isConnected && walletChainId !== requiredEnsChainId;

  // Auto re-resolve after tx confirmation
  const resolveRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (isTxConfirmed && resolveRef.current) {
      const timer = setTimeout(() => {
        resolveRef.current?.();
        resetTx();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isTxConfirmed, resetTx]);

  // Intro scramble: empty → placeholder labels → default values
  const [introText, setIntroText] = useState<{ ens: string; agent: string }>({ ens: "", agent: "" });
  const [introPhase, setIntroPhase] = useState<"empty" | "placeholder" | "default" | "done">("empty");

  const { ref: introEnsRef } = useScramble({
    text: introText.ens,
    speed: 0.6,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 0,
    onAnimationEnd: () => {
      if (introPhase === "default") setIntroPhase("done");
    },
  });

  const { ref: introAgentRef } = useScramble({
    text: introText.agent,
    speed: 0.6,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 0,
  });

  useEffect(() => {
    // Phase 1: scramble in placeholder labels
    const t1 = setTimeout(() => {
      setIntroText({ ens: "name.eth", agent: "agent ID" });
      setIntroPhase("placeholder");
    }, 400);
    // Phase 2: scramble to real defaults
    const t2 = setTimeout(() => {
      setIntroText({ ens: ensName, agent: agentId });
      setIntroPhase("default");
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, []);

  const resolveAttestation = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const trimmedName = ensName.trim();
    const trimmedAgentId = agentId.trim();

    if (!trimmedName || !trimmedAgentId) {
      setState({ status: "error", message: "ENS name and Agent ID are required." });
      return;
    }

    const textRecordKey = buildTextRecordKey(registry.value, trimmedAgentId);
    setState({ status: "loading" });

    try {
      const normalized = normalize(trimmedName);
      const ensClient = getEnsClient(registry.chainId);
      const result = await ensClient.getEnsText({
        name: normalized,
        key: textRecordKey,
      });

      if (controller.signal.aborted) return;

      // Run agent file check and avatar fetch in parallel — neither blocks resolution
      const agentFilePromise = (async (): Promise<AgentFileResult | undefined> => {
        try {
          const registryClient = getClient(registry.chainId);
          const uri = await registryClient.readContract({
            address: registry.contractAddress,
            abi: agentRegistryAbi,
            functionName: "tokenURI",
            args: [BigInt(trimmedAgentId)],
          });

          if (controller.signal.aborted) return undefined;

          if (!uri) {
            return { type: "error", message: "No agent URI returned" };
          }

          const jsonText = await parseAgentFileUri(uri, controller.signal);

          if (controller.signal.aborted) return undefined;

          const endpoint = extractEnsEndpoint(jsonText);
          if (endpoint === null && jsonText.trimStart().startsWith("{")) {
            return { type: "not-set" };
          } else if (endpoint === null) {
            throw new Error("Agent file is not valid JSON");
          } else {
            return checkAgentFile(endpoint, trimmedName);
          }
        } catch (err) {
          if (controller.signal.aborted) return undefined;
          let msg = "Agent file check failed";
          if (err instanceof Error) {
            if (err.message.includes("reverted")) {
              msg = "Agent not found in registry";
            } else if (err.message.includes("not valid JSON")) {
              msg = err.message;
            } else if (err.message.includes("fetch failed")) {
              msg = err.message;
            }
          }
          return { type: "error", message: msg };
        }
      })();

      const avatarPromise = ensClient
        .getEnsAvatar({ name: normalized })
        .catch(() => undefined);

      const [agentFileResult, ensAvatar] = await Promise.all([agentFilePromise, avatarPromise]);

      if (controller.signal.aborted) return;

      if (result) {
        setState({ status: "resolved", textRecordKey, textRecordValue: result, registryAddress: registry.value, agentFileResult, ensAvatar: ensAvatar ?? undefined });
      } else {
        setState({ status: "no-attestation", textRecordKey, registryAddress: registry.value, agentFileResult, ensAvatar: ensAvatar ?? undefined });
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Resolution failed",
      });
    }
  }, [ensName, agentId, registry]);

  // Keep resolveRef in sync
  resolveRef.current = resolveAttestation;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // --- setText handler ---
  const handleWriteAttestation = async (value: string) => {
    const trimmedName = ensName.trim();
    if (!trimmedName || !walletChainId) return;

    const textRecordKey = (state.status === "resolved" || state.status === "no-attestation")
      ? state.textRecordKey
      : buildTextRecordKey(registry.value, agentId.trim());

    const node = namehash(normalize(trimmedName));

    // Look up the resolver for this name on the connected chain
    const registryAddr = ENS_REGISTRY[walletChainId];
    if (!registryAddr) return;

    const client = getClient(walletChainId);
    const resolverAddr = await client.readContract({
      address: registryAddr,
      abi: ensRegistryAbi,
      functionName: "resolver",
      args: [node],
    });

    if (!resolverAddr || resolverAddr === "0x0000000000000000000000000000000000000000") return;

    writeContract({
      address: resolverAddr,
      abi: resolverAbi,
      functionName: "setText",
      args: [node, textRecordKey, value],
    });
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-quartz-0)] antialiased flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ opacity: [0.35, 0.45, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="grid-pattern" x="0" y="0" width="320" height="200" patternUnits="userSpaceOnUse">
              <g clipPath="url(#clip0_33_2)">
                <path d="M2 6C2 2.68629 4.68629 0 8 0H32C35.3137 0 38 2.68629 38 6V34C38 37.3137 35.3137 40 32 40H8C4.68629 40 2 37.3137 2 34V6Z" fill="white" />
                <path d="M46 38C42.6863 38 40 35.3137 40 32V8C40 4.68629 42.6863 2 46 2H74C77.3137 2 80 4.68629 80 8V32C80 35.3137 77.3137 38 74 38H46Z" fill="#FAF9F7" />
                <path d="M82 6C82 2.68629 84.6863 0 88 0H112C115.314 0 118 2.68629 118 6V34C118 37.3137 115.314 40 112 40H88C84.6863 40 82 37.3137 82 34V6Z" fill="white" />
                <path d="M126 38C122.686 38 120 35.3137 120 32V8C120 4.68629 122.686 2 126 2H154C157.314 2 160 4.68629 160 8V32C160 35.3137 157.314 38 154 38H126Z" fill="#FAF9F7" />
                <path d="M162 6C162 2.68629 164.686 0 168 0H192C195.314 0 198 2.68629 198 6V34C198 37.3137 195.314 40 192 40H168C164.686 40 162 37.3137 162 34V6Z" fill="white" />
                <path d="M206 38C202.686 38 200 35.3137 200 32V8C200 4.68629 202.686 2 206 2H234C237.314 2 240 4.68629 240 8V32C240 35.3137 237.314 38 234 38H206Z" fill="#FAF9F7" />
                <path d="M242 6C242 2.68629 244.686 0 248 0H272C275.314 0 278 2.68629 278 6V34C278 37.3137 275.314 40 272 40H248C244.686 40 242 37.3137 242 34V6Z" fill="white" />
                <path d="M282 6C282 2.68629 284.686 0 288 0H312C315.314 0 318 2.68629 318 6V34C318 37.3137 315.314 40 312 40H288C284.686 40 282 37.3137 282 34V6Z" fill="white" />
                <path d="M6 78C2.68629 78 0 75.3137 0 72L0 48C0 44.6863 2.68629 42 6 42H34C37.3137 42 40 44.6863 40 48V72C40 75.3137 37.3137 78 34 78H6Z" fill="#FAF9F7" />
                <path d="M42 46C42 42.6863 44.6863 40 48 40H72C75.3137 40 78 42.6863 78 46V74C78 77.3137 75.3137 80 72 80H48C44.6863 80 42 77.3137 42 74V46Z" fill="white" />
                <path d="M82 46C82 42.6863 84.6863 40 88 40H112C115.314 40 118 42.6863 118 46V74C118 77.3137 115.314 80 112 80H88C84.6863 80 82 77.3137 82 74V46Z" fill="white" />
                <path d="M126 78C122.686 78 120 75.3137 120 72V48C120 44.6863 122.686 42 126 42H154C157.314 42 160 44.6863 160 48V72C160 75.3137 157.314 78 154 78H126Z" fill="#FAF9F7" />
                <path d="M162 46C162 42.6863 164.686 40 168 40H192C195.314 40 198 42.6863 198 46V74C198 77.3137 195.314 80 192 80H168C164.686 80 162 77.3137 162 74V46Z" fill="white" />
                <path d="M202 46C202 42.6863 204.686 40 208 40H232C235.314 40 238 42.6863 238 46V74C238 77.3137 235.314 80 232 80H208C204.686 80 202 77.3137 202 74V46Z" fill="white" />
                <path d="M246 78C242.686 78 240 75.3137 240 72V48C240 44.6863 242.686 42 246 42H274C277.3137 42 280 44.6863 280 48V72C280 75.3137 277.314 78 274 78H246Z" fill="#FAF9F7" />
                <path d="M282 46C282 42.6863 284.686 40 288 40H312C315.314 40 318 42.6863 318 46V74C318 77.3137 315.314 80 312 80H288C284.686 80 282 77.3137 282 74V46Z" fill="white" />
                <path d="M6 118C2.68629 118 0 115.314 0 112L0 88C0 84.6863 2.68629 82 6 82H34C37.3137 82 40 84.6863 40 88V112C40 115.314 37.3137 118 34 118H6Z" fill="#FAF9F7" />
                <path d="M42 86C42 82.6863 44.6863 80 48 80H72C75.3137 80 78 82.6863 78 86V114C78 117.314 75.3137 120 72 120H48C44.6863 120 42 117.314 42 114V86Z" fill="white" />
                <path d="M86 118C82.6863 118 80 115.314 80 112V88C80 84.6863 82.6863 82 86 82H114C117.314 82 120 84.6863 120 88V112C120 115.314 117.314 118 114 118H86Z" fill="#FAF9F7" />
                <path d="M122 86C122 82.6863 124.686 80 128 80H152C155.314 80 158 82.6863 158 86V114C158 117.314 155.314 120 152 120H128C124.686 120 122 117.314 122 114V86Z" fill="white" />
                <path d="M166 118C162.686 118 160 115.314 160 112V88C160 84.6863 162.686 82 166 82H194C197.314 82 200 84.6863 200 88V112C200 115.314 197.314 118 194 118H166Z" fill="#FAF9F7" />
                <path d="M202 86C202 82.6863 204.686 80 208 80H232C235.314 80 238 82.6863 238 86V114C238 117.314 235.314 120 232 120H208C204.686 120 202 117.314 202 114V86Z" fill="white" />
                <path d="M246 118C242.686 118 240 115.314 240 112V88C240 84.6863 242.686 82 246 82H274C277.314 82 280 84.6863 280 88V112C280 115.314 277.314 118 274 118H246Z" fill="#FAF9F7" />
                <path d="M282 86C282 82.6863 284.686 80 288 80H312C315.314 80 318 82.6863 318 86V114C318 117.314 315.314 120 312 120H288C284.686 120 282 117.314 282 114V86Z" fill="white" />
                <path d="M2 126C2 122.686 4.68629 120 8 120H32C35.3137 120 38 122.686 38 126V154C38 157.314 35.3137 160 32 160H8C4.68629 160 2 157.314 2 154V126Z" fill="white" />
                <path d="M42 126C42 122.686 44.6863 120 48 120H72C75.3137 120 78 122.686 78 126V154C78 157.314 75.3137 160 72 160H48C44.6863 160 42 157.314 42 154V126Z" fill="white" />
                <path d="M86 158C82.6863 158 80 155.314 80 152V128C80 124.686 82.6863 122 86 122H114C117.314 122 120 124.686 120 128V152C120 155.314 117.314 158 114 158H86Z" fill="#FAF9F7" />
                <path d="M2 166C2 162.686 4.68629 160 8 160H32C35.3137 160 38 162.686 38 166V194C38 197.314 35.3137 200 32 200H8C4.68629 200 2 197.314 2 194V166Z" fill="white" />
                <path d="M202 126C202 122.686 204.686 120 208 120H232C235.314 120 238 122.686 238 126V154C238 157.314 235.314 160 232 160H208C204.686 160 202 157.314 202 154V126Z" fill="white" />
                <path d="M122 126C122 122.686 124.686 120 128 120H152C155.314 120 158 122.686 158 126V154C158 157.314 155.314 160 152 160H128C124.686 160 122 157.314 122 154V126Z" fill="white" />
                <path d="M242 126C242 122.686 244.686 120 248 120H272C275.314 120 278 122.686 278 126V154C278 157.314 275.314 160 272 160H248C244.686 160 242 157.314 242 154V126Z" fill="white" />
                <path d="M166 158C162.686 158 160 155.314 160 152V128C160 124.686 162.686 122 166 122H194C197.314 122 200 124.686 200 128V152C200 155.314 197.314 158 194 158H166Z" fill="#FAF9F7" />
                <path d="M162 166C162 162.686 164.686 160 168 160H192C195.314 160 198 162.686 198 166V194C198 197.314 195.314 200 192 200H168C164.686 200 162 197.314 162 194V166Z" fill="white" />
                <path d="M242 166C242 162.686 244.686 160 248 160H272C275.314 160 278 162.686 278 166V194C278 197.314 275.314 200 272 200H248C244.686 160 242 197.314 242 194V166Z" fill="white" />
                <path d="M122 166C122 162.686 124.686 160 128 160H152C155.314 160 158 162.686 158 166V194C158 197.314 155.314 200 152 200H128C124.686 160 122 197.314 122 194V166Z" fill="white" />
                <path d="M206 198C202.686 198 200 195.314 200 192V168C200 164.686 202.686 162 206 162H234C237.314 162 240 164.686 240 168V192C240 195.314 237.314 198 234 198H206Z" fill="#FAF9F7" />
                <path d="M286 158C282.686 158 280 155.314 280 152V128C280 124.686 282.686 122 286 122H314C317.314 122 320 124.686 320 128V152C320 155.314 317.314 158 314 158H286Z" fill="#FAF9F7" />
                <path d="M46 198C42.6863 198 40 195.314 40 192V168C40 164.686 42.6863 162 46 162H74C77.3137 162 80 164.686 80 168V192C80 195.314 77.3137 198 74 198H46Z" fill="#FAF9F7" />
                <path d="M82 166C82 162.686 84.6863 160 88 160H112C115.314 160 118 162.686 118 166V194C118 197.314 115.314 200 112 200H88C84.6863 200 82 197.314 82 194V166Z" fill="white" />
                <path d="M286 198C282.686 198 280 195.314 280 192V168C280 164.686 282.686 162 286 162H314C317.314 162 320 164.686 320 168V192C320 195.314 317.314 198 314 198H286Z" fill="#FAF9F7" />
              </g>
              <clipPath id="clip0_33_2">
                <rect width="320" height="200" fill="white" />
              </clipPath>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tiny-grid-pattern)" />
        </svg>
      </motion.div>
      <motion.div
        className="w-full max-w-[600px] mx-auto px-4"
        variants={scrollEnterVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2, margin: "-80px" }}
      >
        {/* Header */}
        <motion.div className="mb-6 text-left w-fit mx-auto flex flex-col gap-0" variants={scrollEnterItemVariants}>
          <span className="inline-block mb-2 text-[12px] font-medium tracking-[0.48px] uppercase text-[var(--color-quartz-900)]" style={{ fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace', fontFeatureSettings: "'ss01'" }}>
            ENSIP-25
          </span>
          <h1 className="text-[32px] sm:text-[37.8px] font-bold tracking-[-0.756px] leading-[normal]" style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'", color: `var(--color-${colorTheme}-500)` }}>
            Agent Registry Attestation
          </h1>
          <p className="mt-2 text-[12px] font-medium tracking-[0.24px] text-[var(--color-quartz-900)] max-w-[360px]" style={{ fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace', fontFeatureSettings: "'ss01'" }}>
            Verify bidirectional attestations between ENS names and agent identities, or connect a wallet to set and manage attestation records.
          </p>
        </motion.div>
        <motion.section className="place-content-start flex flex-col max-w-[500px] mx-auto">
          {/* Row 1: Resolve button + ENS Name */}
          <motion.div className="flex items-center justify-center gap-[6px] mb-[5px] min-h-[31px]" variants={scrollEnterItemVariants}>
            {/* Resolve button */}
            <motion.button
              onClick={resolveAttestation}
              variants={buttonVariants}
              initial="idle"
              animate={state.status === "loading" ? "active" : "idle"}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center shrink-0 aspect-square p-1.5 rounded-[3px]"
              style={{ backgroundColor: `var(--color-${colorTheme}-100)` }}
            >
              <IconPlay size={16} style={{ color: `var(--color-${colorTheme}-500)` }} />
            </motion.button>

            {/* ENS Name input pill */}
            <div className="relative bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-2 h-full flex items-center min-w-0 flex-1">
              <div className="relative w-full">
                {/* Intro scramble overlay */}
                {introPhase !== "done" && (
                  <span
                    ref={introEnsRef}
                    className="absolute inset-0 pointer-events-none text-[16px] sm:text-[18px] font-bold text-[var(--color-quartz-900)] flex items-center"
                    style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                    aria-hidden="true"
                  />
                )}
                {/* Colored overlay text */}
                {introPhase === "done" && ensName.includes('.eth') && (
                  <div
                    className="absolute inset-0 pointer-events-none text-[16px] sm:text-[18px] font-bold whitespace-pre flex"
                    style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                    aria-hidden="true"
                  >
                    <span className="text-[var(--color-quartz-900)]">{ensName.split('.eth')[0]}</span>
                    <span style={{ color: `var(--color-${colorTheme}-500)` }}>.eth</span>
                    <span className="text-[var(--color-quartz-900)]">{ensName.split('.eth').slice(1).join('.eth')}</span>
                  </div>
                )}
                <input
                  type="text"
                  value={ensName}
                  onChange={(e) => { setEnsName(e.target.value); setIntroPhase("done"); }}
                  placeholder="name.eth"
                  spellCheck={false}
                  className="bg-transparent text-[16px] sm:text-[18px] font-bold outline-none placeholder:text-[var(--color-quartz-350)] w-full min-w-0 relative"
                  style={{
                    fontFamily: 'ABC Monument Grotesk, sans-serif',
                    fontFeatureSettings: "'ss01'",
                    color: introPhase !== "done"
                      ? 'transparent'
                      : ensName.includes('.eth') ? 'transparent' : 'var(--color-quartz-900)',
                    caretColor: 'var(--color-quartz-900)'
                  }}
                />
              </div>
              {state.status === "loading" && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      variants={dotVariants}
                      initial="initial"
                      animate="animate"
                      className="inline-block h-1 w-1 rounded-full"
                      style={{ backgroundColor: `var(--color-${colorTheme}-500)` }}
                      transition={{ delay: i * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Row 2: Agent ID + Registry — pl offsets for resolve button width + gap to align with ENS input */}
          <motion.div className="flex items-center justify-start gap-[6px] mb-[5px] min-h-[31px] pl-[34px]" variants={scrollEnterItemVariants}>
            {/* Agent ID input pill */}
            <div className="relative bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-2 h-full flex items-center min-w-0 w-[100px]">
              {introPhase !== "done" ? (
                <span
                  ref={introAgentRef}
                  className="text-[16px] sm:text-[18px] font-bold text-[var(--color-quartz-900)] whitespace-nowrap inline-block min-w-[60px] min-h-[1.5em]"
                  style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                />
              ) : (
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Agent ID"
                  spellCheck={false}
                  className="bg-transparent text-[16px] sm:text-[18px] font-bold outline-none placeholder:text-[var(--color-quartz-350)] w-full min-w-0"
                  style={{
                    fontFamily: 'ABC Monument Grotesk, sans-serif',
                    fontFeatureSettings: "'ss01'",
                    color: 'var(--color-quartz-900)',
                  }}
                />
              )}
            </div>

            {/* Separator diamond */}
            <div className="flex items-center justify-center shrink-0 w-[5.759px] h-[5.514px]">
              <div className="rotate-90" style={{ transform: 'rotate(90deg) scaleY(-1)' }}>
                <div className="w-[5.514px] h-[5.759px] rounded-[1px]" style={{ backgroundColor: `var(--color-${colorTheme}-500)` }} />
              </div>
            </div>

            {/* Registry dropdown pill */}
            <div className="relative bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-1.5 h-full flex items-center gap-[7.6px] shrink-0 min-w-[120px] overflow-visible">
              <div className="relative flex items-center pr-4 flex-1 min-h-[23px] overflow-visible">
                <span
                  className="text-[16px] sm:text-[18px] font-bold text-[var(--color-quartz-900)] whitespace-nowrap"
                  style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                >
                  {registry.label}
                </span>
              </div>
              <select
                value={registry.value}
                onChange={(e) => {
                  setRegistry(REGISTRIES.find((r) => r.value === e.target.value)!);
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer appearance-none"
                style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                aria-label="Select registry"
              >
                {REGISTRIES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 pointer-events-none" style={{ width: '8px', height: '5px', transform: 'translateY(-50%)', fill: 'currentColor' }} viewBox="0 0 8 5">
                <path d="M4 5L0 0h8L4 5z" />
              </svg>
            </div>
          </motion.div>

          {/* Output Card */}
          <div>
            <AnimatePresence mode="wait">
              {state.status === "resolved" && (
                <motion.div
                  key={state.textRecordKey + state.textRecordValue}
                  variants={resultVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-100 place-self-center bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-[9px] py-[10px]"
                >
                  <div className="pt-3">
                    <OutputRow
                      label="ENS NAME"
                      value={ensName.trim()}
                      accentColor={colorTheme}
                      avatar={state.ensAvatar}
                    />
                  </div>
                  <div className="pt-3">
                    <OutputRow
                      label="ERC-7930 ENCODED REGISTRY ADDRESS"
                      value={state.registryAddress}
                      mono
                      accentColor={colorTheme}
                    />
                  </div>
                  <div className="pt-3">
                    <OutputRow
                      label="TEXT RECORD KEY"
                      value={state.textRecordKey}
                      mono
                      accent
                      accentColor={colorTheme}
                    />
                  </div>
                  <div className="pt-3">
                    <OutputRow
                      label="ATTESTATION (ENS → AGENT)"
                      value={state.textRecordValue}
                      mono
                      accentColor={colorTheme}
                    />
                  </div>
                  {state.agentFileResult && (
                    <div className="pt-3">
                      <AgentFileRow result={state.agentFileResult} accentColor={colorTheme} />
                    </div>
                  )}
                  {state.agentFileResult && (
                    <div className="pt-3">
                      <VerificationLoopRow
                        ensToAgent={true}
                        agentToEns={state.agentFileResult.type === "valid"}
                        accentColor={colorTheme}
                      />
                    </div>
                  )}
                  <SetAttestationSection
                    isConnected={isConnected}
                    isTxPending={isTxPending}
                    isTxConfirming={isTxConfirming}
                    isTxConfirmed={isTxConfirmed}
                    onWriteAttestation={handleWriteAttestation}
                    hasExistingAttestation={state.status === "resolved"}
                    isWrongChain={isWrongChain}
                    requiredEnsChainId={requiredEnsChainId}
                    onSwitchChain={(chainId) => switchChain({ chainId })}
                    accentColor={colorTheme}
                  />
                </motion.div>
              )}

              {state.status === "no-attestation" && (
                <motion.div
                  key={"no-attestation-" + state.textRecordKey}
                  variants={resultVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-100 place-self-center bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-[9px] py-[10px]"
                >
                  <div className="pt-3">
                    <OutputRow
                      label="ENS NAME"
                      value={ensName.trim()}
                      accentColor={colorTheme}
                      avatar={state.ensAvatar}
                    />
                  </div>
                  <div className="pt-3">
                    <OutputRow
                      label="ERC-7930 ENCODED REGISTRY ADDRESS"
                      value={state.registryAddress}
                      mono
                      accentColor={colorTheme}
                    />
                  </div>
                  <div className="pt-3">
                    <OutputRow
                      label="TEXT RECORD KEY"
                      value={state.textRecordKey}
                      mono
                      accent
                      accentColor={colorTheme}
                    />
                  </div>
                  <div className="pt-3">
                    <OutputRow
                      label="ATTESTATION (ENS → AGENT)"
                      value="no attestation found"
                      mono
                      accentColor={colorTheme}
                    />
                  </div>
                  {state.agentFileResult && (
                    <div className="pt-3">
                      <AgentFileRow result={state.agentFileResult} accentColor={colorTheme} />
                    </div>
                  )}
                  {state.agentFileResult && (
                    <div className="pt-3">
                      <VerificationLoopRow
                        ensToAgent={false}
                        agentToEns={state.agentFileResult.type === "valid"}
                        accentColor={colorTheme}
                      />
                    </div>
                  )}
                  <SetAttestationSection
                    isConnected={isConnected}
                    isTxPending={isTxPending}
                    isTxConfirming={isTxConfirming}
                    isTxConfirmed={isTxConfirmed}
                    onWriteAttestation={handleWriteAttestation}
                    hasExistingAttestation={false}
                    isWrongChain={isWrongChain}
                    requiredEnsChainId={requiredEnsChainId}
                    onSwitchChain={(chainId) => switchChain({ chainId })}
                    accentColor={colorTheme}
                  />
                </motion.div>
              )}

              {state.status === "error" && (
                <motion.p
                  key="error"
                  variants={resultVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mt-5 text-sm text-red-600 text-center"
                  style={{ fontFamily: 'ABC Monument Grotesk, sans-serif' }}
                >
                  {state.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}

// --- Set Attestation section -----------------------------------------------

function SetAttestationSection({
  isConnected,
  isTxPending,
  isTxConfirming,
  isTxConfirmed,
  hasExistingAttestation,
  onWriteAttestation,
  isWrongChain,
  requiredEnsChainId,
  onSwitchChain,
  accentColor,
}: {
  isConnected: boolean;
  isTxPending: boolean;
  isTxConfirming: boolean;
  isTxConfirmed: boolean;
  hasExistingAttestation: boolean;
  onWriteAttestation: (value: string) => void;
  isWrongChain: boolean;
  requiredEnsChainId: number;
  onSwitchChain: (chainId: number) => void;
  accentColor: ColorTheme;
}) {
  const busy = isTxPending || isTxConfirming;

  const targetChainName = requiredEnsChainId === 11155111 ? "Sepolia" : "Mainnet";

  let statusLabel: string | null = null;
  let statusColor = "var(--color-quartz-350)";
  if (isTxConfirmed) {
    statusLabel = "Confirmed — re-resolving...";
    statusColor = `var(--color-${accentColor}-500)`;
  } else if (isTxConfirming) {
    statusLabel = "Confirming...";
  } else if (isTxPending) {
    statusLabel = "Awaiting wallet signature...";
  }

  const buttonStyle = {
    fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace',
    fontFeatureSettings: "'ss01'",
  } as const;

  return (
    <div className="pt-4 mt-1 border-t border-[var(--color-quartz-100)]">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.48px] opacity-70 text-[var(--color-quartz-900)]"
        style={{ fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace', fontFeatureSettings: "'ss01'" }}
      >
        MANAGE ATTESTATION
      </span>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="text-[12px] font-medium px-3 py-1.5 rounded-[3px] cursor-pointer"
                style={{
                  ...buttonStyle,
                  backgroundColor: `var(--color-${accentColor}-100)`,
                  color: `var(--color-${accentColor}-500)`,
                }}
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : isWrongChain ? (
          <button
            onClick={() => onSwitchChain(requiredEnsChainId)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-[3px] cursor-pointer"
            style={{
              ...buttonStyle,
              backgroundColor: `var(--color-${accentColor}-100)`,
              color: `var(--color-${accentColor}-500)`,
            }}
          >
            Switch to {targetChainName}
          </button>
        ) : (
          <>
            <button
              onClick={() => onWriteAttestation("1")}
              disabled={busy}
              className="text-[12px] font-medium px-3 py-1.5 rounded-[3px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                ...buttonStyle,
                backgroundColor: `var(--color-${accentColor}-100)`,
                color: `var(--color-${accentColor}-500)`,
              }}
            >
              Set Record
            </button>
            {hasExistingAttestation && (
              <button
                onClick={() => onWriteAttestation("")}
                disabled={busy}
                className="text-[12px] font-medium px-3 py-1.5 rounded-[3px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  ...buttonStyle,
                  backgroundColor: "var(--color-quartz-100)",
                  color: "var(--color-quartz-500)",
                }}
              >
                Remove Record
              </button>
            )}
          </>
        )}
        {statusLabel && (
          <span
            className="text-[11px] font-medium tracking-[0.24px]"
            style={{
              fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace',
              fontFeatureSettings: "'ss01'",
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Agent file row sub-component -----------------------------------------

function AgentFileRow({ result, accentColor }: { result: AgentFileResult; accentColor: ColorTheme }) {
  let displayValue: string;
  let valueColor: string;

  switch (result.type) {
    case "valid":
      displayValue = `${result.endpoint} — Valid`;
      valueColor = `var(--color-${accentColor}-500)`;
      break;
    case "invalid":
      displayValue = `${result.endpoint} — Invalid`;
      valueColor = "var(--color-red-500, #ef4444)";
      break;
    case "not-set":
      displayValue = "Name not set";
      valueColor = "var(--color-quartz-350)";
      break;
    case "error":
      displayValue = result.message;
      valueColor = "var(--color-quartz-350)";
      break;
  }

  return (
    <OutputRow
      label="REGISTRATION (AGENT → ENS)"
      value={displayValue}
      mono
      accentColor={accentColor}
      customValueColor={valueColor}
    />
  );
}

// --- Verification loop sub-component --------------------------------------

function VerificationLoopRow({
  ensToAgent,
  agentToEns,
  accentColor,
}: {
  ensToAgent: boolean;
  agentToEns: boolean;
  accentColor: ColorTheme;
}) {
  const closed = ensToAgent && agentToEns;
  let displayValue: string;
  let valueColor: string;

  if (closed) {
    displayValue = "Closed — verified in both directions";
    valueColor = `var(--color-${accentColor}-500)`;
  } else if (ensToAgent) {
    displayValue = "ENS → Agent only";
    valueColor = "var(--color-quartz-350)";
  } else if (agentToEns) {
    displayValue = "Agent → ENS only";
    valueColor = "var(--color-quartz-350)";
  } else {
    displayValue = "Open — no verification in either direction";
    valueColor = "var(--color-quartz-350)";
  }

  return (
    <OutputRow
      label="VERIFICATION LOOP"
      value={displayValue}
      accentColor={accentColor}
      customValueColor={valueColor}
    />
  );
}

// --- Output row sub-component ---------------------------------------------

function OutputRow({
  label,
  value,
  truncated,
  mono,
  accent,
  accentColor,
  customValueColor,
  avatar,
}: {
  label: string;
  value: string;
  truncated?: string;
  mono?: boolean;
  accent?: boolean;
  accentColor: ColorTheme;
  customValueColor?: string;
  avatar?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const { ref: mainRef, replay: replayMain } = useScramble({
    text: truncated ?? value,
    speed: 0.6,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 0,
    onAnimationEnd: () => setTextRevealed(true),
  });

  const { ref: fullRef, replay: replayFull } = useScramble({
    text: value,
    speed: 0.6,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 0,
  });

  useEffect(() => {
    setTextRevealed(false);
    replayMain();
    if (truncated) {
      replayFull();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only replay on data change
  }, [value, truncated]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-[2px]">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.48px] opacity-70 text-[var(--color-quartz-900)]"
        style={{ fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace', fontFeatureSettings: "'ss01'" }}
      >
        {label}
      </span>
      <div className={`flex ${avatar && !avatarError ? "items-center" : "items-baseline"} gap-[4px]`}>
        {avatar && !avatarError && (
          <img
            src={avatar}
            alt=""
            className="w-[16px] h-[16px] rounded-full object-cover shrink-0"
            onError={() => setAvatarError(true)}
          />
        )}
        <span
          ref={mainRef}
          className="text-[14px] sm:text-[16px] tracking-[-0.32px] break-all"
          style={{
            fontFamily: mono ? 'ABC Monument Grotesk Mono, monospace' : 'ABC Monument Grotesk Mono, monospace',
            fontFeatureSettings: "'ss01'",
            color: customValueColor ?? (accent ? `var(--color-${accentColor}-500)` : 'var(--color-quartz-900)')
          }}
          title={value}
        />
        {textRevealed && value && (
          <motion.button
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              visible: { opacity: 1, scale: 1 },
              copied: { scale: [1, 1.2, 1], transition: { duration: AC.FAST, ease: AC.EASE } },
            }}
            initial="hidden"
            animate={copied ? "copied" : "visible"}
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="shrink-0 cursor-pointer inline-flex items-center justify-center"
            style={{ color: '#1d1c1c' }}
          >
            <span style={{ transform: 'scale(0.9)' }}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </span>
          </motion.button>
        )}
      </div>
      {truncated && (
        <span
          ref={fullRef}
          className="text-[10px] tracking-[-0.18px] text-[var(--color-quartz-350)] break-all"
          style={{ fontFamily: 'ABC Monument Grotesk Mono, monospace', fontFeatureSettings: "'ss01'" }}
        />
      )}
    </div>
  );
}
