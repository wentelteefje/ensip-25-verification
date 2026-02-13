/**
 * InteropAddress — ERC-7930/7828 ENS resolution demo.
 * - Play/pause cycles ENS names (vitalik.eth → nick.eth → validator.eth → jamesbeck.eth)
 *   and networks (Ethereum → Arbitrum → Base → Optimism → Polygon) in sync.
 * - Scroll-in-view orchestrated enter animation (header → input → output)
 * - Chain pill animates (opacity/y) when network changes during autoplay.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { useScramble } from "use-scramble";

// --- Chain data -----------------------------------------------------------

interface Chain {
  name: string;
  shortName: string;
  chainId: number;
  caipId: string;
}

const CHAINS: Chain[] = [
  { name: "Ethereum", shortName: "ethereum", chainId: 1, caipId: "eip155:1" },
  {
    name: "Arbitrum One",
    shortName: "arbitrum",
    chainId: 42161,
    caipId: "eip155:42161",
  },
  { name: "Base", shortName: "base", chainId: 8453, caipId: "eip155:8453" },
  {
    name: "Optimism",
    shortName: "optimism",
    chainId: 10,
    caipId: "eip155:10",
  },
  {
    name: "Polygon",
    shortName: "polygon",
    chainId: 137,
    caipId: "eip155:137",
  },
];

// --- Preset examples ------------------------------------------------------

const CYCLE_EXAMPLES = ["vitalik.eth", "nick.eth", "validator.eth", "jamesbeck.eth"];

// --- Animation config -----------------------------------------------------
// Centralized timing/easing for consistent motion. Use AC in variants instead of inline values.

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

/* Inline SVG icons — no external font; reliable when embedded. Replace paths with Figma export if needed. */
const ICON_SIZE = 24;
type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

function IconPlay({ size = ICON_SIZE, className = "", style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 11 14" fill="currentColor" aria-hidden>
      <path d="M0 14V0L11 7L0 14ZM2 10.35L7.25 7L2 3.65V10.35Z" />
    </svg>
  );
}
function IconPause({ size = ICON_SIZE, className = "", style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <path d="M8 14V0H14V14H8ZM0 14V0H6V14H0ZM10 12H12V2H10V12ZM2 12H4V2H2V12Z" />
    </svg>
  );
}
function IconCalculate({ size = ICON_SIZE, className = "", style }: IconProps) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <path d="M5 15H6.5V13H8.5V11.5H6.5V9.5H5V11.5H3V13H5V15ZM10 14.25H15V12.75H10V14.25ZM10 11.75H15V10.25H10V11.75ZM11.1 7.95L12.5 6.55L13.9 7.95L14.95 6.9L13.55 5.45L14.95 4.05L13.9 3L12.5 4.4L11.1 3L10.05 4.05L11.45 5.45L10.05 6.9L11.1 7.95ZM3.25 6.2H8.25V4.7H3.25V6.2ZM2 18C1.45 18 0.975 17.8083 0.575 17.425C0.191667 17.025 0 16.55 0 16V2C0 1.45 0.191667 0.983333 0.575 0.599999C0.975 0.199999 1.45 0 2 0H16C16.55 0 17.0167 0.199999 17.4 0.599999C17.8 0.983333 18 1.45 18 2V16C18 16.55 17.8 17.025 17.4 17.425C17.0167 17.8083 16.55 18 16 18H2ZM2 16H16V2H2V16Z" />
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
  | { status: "resolved"; address: string }
  | { status: "not-found" }
  | { status: "invalid-tld" }
  | { status: "error"; message: string };

async function resolveENS(
  name: string,
  signal: AbortSignal
): Promise<string | null> {
  const res = await fetch(`https://ensdata.net/${name}`, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  return data.address ?? null;
}

const isHexAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v);

const VALID_TLDS = ['.eth'];

const hasValidTLD = (v: string): boolean => {
  if (isHexAddress(v)) return true;
  // Must have a valid TLD (.eth)
  return VALID_TLDS.some(tld => v.endsWith(tld));
};

const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

// --- Color palette --------------------------------------------------------

type ColorTheme = "citrine" | "peridot" | "magenta" | "azure";

const COLOR_THEMES: ColorTheme[] = ["citrine", "peridot", "magenta", "azure"];

function getRandomColor(): ColorTheme {
  return COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)];
}

// --- Component ------------------------------------------------------------

export default function InteropAddress() {
  const [input, setInput] = useState("");
  const [chain, setChain] = useState<Chain>(CHAINS[0]);
  const [state, setState] = useState<ResolveState>({ status: "idle" });
  const [archivedResult, setArchivedResult] = useState<{
    address: string;
    interopName: string;
    chainCaipId: string;
  } | null>(null);
  const [colorTheme] = useState<ColorTheme>(getRandomColor);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );
  const chainCycleRef = useRef(0);
  const typeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const resolve = useCallback(async (value: string) => {
    abortRef.current?.abort();

    // Check for valid TLD
    if (!hasValidTLD(value)) {
      setState({ status: "invalid-tld" });
      return;
    }

    if (isHexAddress(value)) {
      setState({ status: "resolved", address: value });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });

    try {
      const address = await resolveENS(value, controller.signal);
      if (controller.signal.aborted) return;
      if (address) {
        setState({ status: "resolved", address });
      } else {
        setState({ status: "not-found" });
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Resolution failed",
      });
    }
  }, []);

  const TYPE_CHAR_MS = 80;

  /** Types `name` into input character by character, then resolves. Clears any in-flight type timeout. */
  const typeInName = useCallback(
    (name: string) => {
      clearTimeout(typeTimeoutRef.current);
      setInput("");
      clearTimeout(debounceRef.current);
      let i = 0;
      const run = () => {
        if (i <= name.length) {
          setInput(name.slice(0, i));
          if (i === name.length) {
            resolve(name);
          } else {
            typeTimeoutRef.current = setTimeout(run, TYPE_CHAR_MS);
            i++;
          }
        }
      };
      run();
    },
    [resolve]
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    clearTimeout(debounceRef.current);
    clearTimeout(typeTimeoutRef.current);
    setIsPlaying(false);

    if (!value.trim()) {
      abortRef.current?.abort();
      // Keep previous resolved state instead of clearing
      if (state.status !== "resolved") {
        setState({ status: "idle" });
      }
      return;
    }

    if (isHexAddress(value.trim()) || value.includes(".")) {
      debounceRef.current = setTimeout(() => resolve(value.trim()), 400);
    }
  };

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Handle play/pause cycling — type each name and advance network in sync
  useEffect(() => {
    if (isPlaying) {
      chainCycleRef.current = 0;
      setChain(CHAINS[0]);
      const currentName = CYCLE_EXAMPLES[cycleIndex];
      typeInName(currentName);

      cycleIntervalRef.current = setInterval(() => {
        setCycleIndex((prev) => {
          const nextIndex = (prev + 1) % CYCLE_EXAMPLES.length;
          typeInName(CYCLE_EXAMPLES[nextIndex]);
          return nextIndex;
        });
        chainCycleRef.current = (chainCycleRef.current + 1) % CHAINS.length;
        setChain(CHAINS[chainCycleRef.current]);
      }, 3500);
    } else {
      clearInterval(cycleIntervalRef.current);
    }

    return () => {
      clearInterval(cycleIntervalRef.current);
      clearTimeout(typeTimeoutRef.current);
    };
  }, [isPlaying, cycleIndex, typeInName]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(typeTimeoutRef.current);
      abortRef.current?.abort();
      clearInterval(cycleIntervalRef.current);
    };
  }, []);

  const interopName =
    input.trim() && state.status === "resolved"
      ? `${input.trim()}@${chain.shortName}`
      : null;

  // Archive the result when successfully resolved, clear on errors
  useEffect(() => {
    if (state.status === "resolved" && interopName) {
      setArchivedResult({
        address: state.address,
        interopName: interopName,
        chainCaipId: chain.caipId,
      });
    } else if (state.status === "not-found" || state.status === "error" || state.status === "invalid-tld") {
      // Clear archived result when we get an error or not-found
      setArchivedResult(null);
    }
  }, [state.status, state.status === "resolved" ? state.address : undefined, interopName, chain.caipId]);

  return (
    <div className="w-full min-h-screen bg-[var(--color-quartz-0)] antialiased flex items-center justify-center relative overflow-hidden">
      {/* Background pattern — subtle opacity pulse so it feels alive */}
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
                <path d="M246 78C242.686 78 240 75.3137 240 72V48C240 44.6863 242.686 42 246 42H274C277.314 42 280 44.6863 280 48V72C280 75.3137 277.314 78 274 78H246Z" fill="#FAF9F7" />
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
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
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
        <motion.div className="mb-6  text-left w-fit mx-auto flex flex-col gap-0" variants={scrollEnterItemVariants}>
          <span className="inline-block mb-2 text-[12px] font-medium tracking-[0.48px] uppercase text-[var(--color-quartz-900)]" style={{ fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace', fontFeatureSettings: "'ss01'" }}>
            ERC-7930 &amp; ERC-7828
          </span>
          <h1 className="text-[32px] sm:text-[37.8px] font-bold tracking-[-0.756px] leading-[normal]" style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'", color: `var(--color-${colorTheme}-500)` }}>
            Interoperable Addresses
          </h1>
        </motion.div>
        <motion.section className="place-content-start flex flex-col max-w-[400px] mx-auto">
          {/* Input row */}
          <motion.div className="flex items-center justify-center gap-[6px] mb-[5px] min-h-[31px]" variants={scrollEnterItemVariants}>
            {/* Play/Pause button */}
            <motion.button
              onClick={togglePlayPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center shrink-0 aspect-square p-1.5 rounded-[3px]"
              style={{ backgroundColor: `var(--color-${colorTheme}-100)` }}
            >
              {isPlaying ? <IconPause size={16} style={{ color: `var(--color-${colorTheme}-500)` }} /> : <IconPlay size={16} style={{ color: `var(--color-${colorTheme}-500)` }} />}
            </motion.button>
            {/* Name input pill */}
            <div className="relative bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-2 h-full flex items-center min-w-0 flex-1 sm:flex-initial">
              <div className="relative w-full">
                {/* Colored overlay text */}
                {input.includes('.eth') && (
                  <div
                    className="absolute inset-0 pointer-events-none text-[16px] sm:text-[18px] font-bold whitespace-pre flex"
                    style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                    aria-hidden="true"
                  >
                    <span className="text-[var(--color-quartz-900)]">{input.split('.eth')[0]}</span>
                    <span style={{ color: `var(--color-${colorTheme}-500)` }}>.eth</span>
                    <span className="text-[var(--color-quartz-900)]">{input.split('.eth').slice(1).join('.eth')}</span>
                  </div>
                )}
                {/* Actual input */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="onshow.eth"
                  spellCheck={false}
                  className="bg-transparent text-[16px] sm:text-[18px] font-bold outline-none placeholder:text-[var(--color-quartz-350)] full min-w-0 relative"
                  style={{
                    fontFamily: 'ABC Monument Grotesk, sans-serif',
                    fontFeatureSettings: "'ss01'",
                    color: input.includes('.eth') ? 'transparent' : 'var(--color-quartz-900)',
                    caretColor: 'var(--color-quartz-900)'
                  }}
                />
              </div>
              {
                state.status === "loading" && (
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
                )
              }
            </div>

            {/* Separator diamond */}
            <div className="flex items-center justify-center shrink-0 w-[5.759px] h-[5.514px]">
              <div className="rotate-90" style={{ transform: 'rotate(90deg) scaleY(-1)' }}>
                <div className="w-[5.514px] h-[5.759px] rounded-[1px]" style={{ backgroundColor: `var(--color-${colorTheme}-500)` }} />
              </div>
            </div>

            {/* Chain select pill — animates when chain changes during autoplay */}
            <div className="relative bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-1.5  h-full flex items-center gap-[7.6px] flex-shrink-0 min-w-[100px]">
              <div className="relative flex items-center pr-4  flex-1 min-h-[23px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={chain.shortName}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: AC.FAST, ease: AC.EASE }}
                    className="  text-[16px] sm:text-[18px] font-bold text-[var(--color-quartz-900)]"
                    style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                  >
                    {chain.shortName}
                  </motion.span>
                </AnimatePresence>
              </div>
              <select
                value={chain.shortName}
                onChange={(e) => {
                  setIsPlaying(false);
                  setChain(CHAINS.find((c) => c.shortName === e.target.value)!);
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer appearance-none"
                style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
                aria-label="Select network"
              >
                {CHAINS.map((c) => (
                  <option key={c.chainId} value={c.shortName}>
                    {c.shortName}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 pointer-events-none" style={{ width: '8px', height: '5px', transform: 'translateY(-50%)', fill: 'currentColor' }} viewBox="0 0 8 5">
                <path d="M4 5L0 0h8L4 5z" />
              </svg>
            </div>

            {/* Calculate button */}
            <motion.button
              onClick={() => input.trim() && resolve(input.trim())}
              variants={buttonVariants}
              initial="idle"
              animate={state.status === "loading" ? "active" : "idle"}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!input.trim()}
              className={`flex items-center justify-center shrink-0 w-[31px] h-[31px] rounded-[3px] transition-opacity ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: `var(--color-${colorTheme}-100)` }}
            >
              <IconCalculate size={16} style={{ color: `var(--color-${colorTheme}-500)` }} />
            </motion.button>


          </motion.div>

          {/* Output Card - Shows current or archived result */}
          <motion.div variants={scrollEnterItemVariants}>
            <AnimatePresence mode="wait">
              {(state.status === "resolved" && interopName) || archivedResult ? (
                <motion.div
                  key={(state.status === "resolved" ? state.address : archivedResult?.address ?? "") + chain.chainId}
                  variants={resultVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-100 place-self-center bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-[9px] py-[10px]"
                >
                  {/* Human-readable format */}
                  <div className="pt-3">
                    <OutputRow
                      label="HUMAN-READABLE"
                      value={state.status === "resolved" && interopName ? interopName : archivedResult?.interopName || ""}
                      mono
                      accent
                      accentColor={colorTheme}
                    />
                  </div>

                  {/* Resolved address */}
                  <div className="pt-3">
                    <OutputRow
                      label="Resolved Address"
                      value={state.status === "resolved" ? state.address : archivedResult?.address || ""}
                      truncated={truncate(state.status === "resolved" ? state.address : archivedResult?.address || "")}
                      mono
                      accentColor={colorTheme}
                    />
                  </div>

                  {/* Chain ID */}
                  <div className="pt-3">
                    <OutputRow
                      label="Chain ID"
                      value={state.status === "resolved" ? chain.caipId : archivedResult?.chainCaipId || ""}
                      accentColor={colorTheme}
                    />
                  </div>
                </motion.div>
              ) : null}

              {state.status === "not-found" && (
                <NotFoundMessage input={input} />
              )}

              {state.status === "invalid-tld" && (
                <motion.p
                  key="invalid-tld"
                  variants={resultVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mt-5 text-sm text-red-600 text-center"
                  style={{ fontFamily: 'ABC Monument Grotesk, sans-serif' }}
                >
                  Invalid domain. Only <strong>.eth</strong> names are supported.
                </motion.p>
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
          </motion.div>
        </motion.section>
      </motion.div>
    </div>
  );
}

// --- Not found message sub-component --------------------------------------

function NotFoundMessage({ input }: { input: string }) {
  const { ref } = useScramble({
    text: input,
    speed: 0.6,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 0,
  });

  return (
    <motion.p
      key="not-found"
      variants={resultVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="mt-5 text-sm text-[var(--color-quartz-350)] text-center"
      style={{ fontFamily: 'ABC Monument Grotesk, sans-serif' }}
    >
      No address found for{" "}
      <strong
        ref={ref}
        className="text-[var(--color-quartz-900)]"
        style={{ fontFamily: 'ABC Monument Grotesk, sans-serif' }}
      />
    </motion.p>
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
}: {
  label: string;
  value: string;
  truncated?: string;
  mono?: boolean;
  accent?: boolean;
  accentColor: ColorTheme;
}) {
  const [copied, setCopied] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);

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

  // Replay scramble when value/truncated change; omit replay fns so effect doesn't run every render
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
      <div className="flex items-baseline gap-[4px]">
        <span
          ref={mainRef}
          className="text-[14px] sm:text-[16px] tracking-[-0.32px] break-all"
          style={{
            fontFamily: mono ? 'ABC Monument Grotesk Mono, monospace' : 'ABC Monument Grotesk Mono, monospace',
            fontFeatureSettings: "'ss01'",
            color: accent ? `var(--color-${accentColor}-500)` : 'var(--color-quartz-900)'
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
