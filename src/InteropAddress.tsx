/**
 * InteropAddress — ERC-7930/7828 ENS resolution demo.
 * - Play/pause cycles through vitalik.eth → nick.eth → validator.eth → jamesbeck.eth
 * - Scroll-in-view orchestrated enter animation (header → input → output)
 * - Play/pause uses Material Symbols play_arrow and pause
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

const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const resultVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 12,
    filter: "blur(4px)"
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT_QUINT },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.2, ease: EASE_OUT_QUINT },
  },
};

const buttonVariants: Variants = {
  idle: {
    scale: 1,
    transition: { duration: 0.3, ease: EASE_OUT_QUINT },
  },
  active: {
    scale: 1.05,
    transition: { duration: 0.2, ease: EASE_OUT_QUINT },
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
    transition: { duration: 0.45, ease: EASE_OUT_QUINT },
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

  // Handle play/pause cycling — type in each name character by character
  useEffect(() => {
    if (isPlaying) {
      const currentName = CYCLE_EXAMPLES[cycleIndex];
      typeInName(currentName);

      cycleIntervalRef.current = setInterval(() => {
        setCycleIndex((prev) => {
          const nextIndex = (prev + 1) % CYCLE_EXAMPLES.length;
          const nextName = CYCLE_EXAMPLES[nextIndex];
          typeInName(nextName);
          return nextIndex;
        });
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
    <div className="w-full min-h-screen bg-[var(--color-quartz-0)] antialiased flex items-center justify-center  ">
      <motion.div
        className="w-full max-w-[600px] mx-auto px-4"
        variants={scrollEnterVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2, margin: "-80px" }
        }
      >
        {/* Header */}
        < motion.div className="mb-6 text-center" variants={scrollEnterItemVariants} >
          <span className="inline-block mb-2 text-[12px] font-medium tracking-[0.48px] uppercase text-[var(--color-quartz-900)]" style={{ fontFamily: 'ABC Monument Grotesk Semi-Mono, monospace', fontFeatureSettings: "'ss01'" }}>
            ERC-7930 &amp; ERC-7828
          </span>
          <h1 className="text-[32px] sm:text-[37.8px] font-bold tracking-[-0.756px] leading-[normal]" style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'", color: `var(--color-${colorTheme}-500)` }}>
            Interoperable Addresses
          </h1>
        </motion.div >
        <motion.section className="place-content-start flex flex-col max-w-[400px] mx-auto">
          {/* Input row */}
          < motion.div className="flex items-center justify-center gap-[6px] mb-[5px] min-h-[31px]" variants={scrollEnterItemVariants} >
            {/* Play/Pause button */}
            < motion.button
              onClick={togglePlayPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center shrink-0 w-[31px] h-[31px] rounded-[3px]"
              style={{ backgroundColor: `var(--color-${colorTheme}-100)` }}
            >
              {isPlaying ? <IconPause size={16} style={{ color: `var(--color-${colorTheme}-500)` }} /> : <IconPlay size={16} style={{ color: `var(--color-${colorTheme}-500)` }} />}
            </motion.button >
            {/* Name input pill */}
            < div className="relative bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-2 h-full flex items-center min-w-0 flex-1 sm:flex-initial" >
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
            </div >

            {/* Separator diamond */}
            < div className="flex items-center justify-center shrink-0 w-[5.759px] h-[5.514px]" >
              <div className="rotate-90" style={{ transform: 'rotate(90deg) scaleY(-1)' }}>
                <div className="w-[5.514px] h-[5.759px] rounded-[1px]" style={{ backgroundColor: `var(--color-${colorTheme}-500)` }} />
              </div>
            </div >

            {/* Chain select pill */}
            < div className="relative bg-[var(--color-quartz-50)] border border-[var(--color-quartz-100)] rounded-[3px] px-2 h-full flex items-center gap-[7.6px] flex-shrink-0" >
              <select
                value={chain.shortName}
                onChange={(e) =>
                  setChain(CHAINS.find((c) => c.shortName === e.target.value)!)
                }
                className="bg-transparent text-[16px] sm:text-[18px] font-bold text-[var(--color-quartz-900)] outline-none cursor-pointer appearance-none pr-4"
                style={{ fontFamily: 'ABC Monument Grotesk, sans-serif', fontFeatureSettings: "'ss01'" }}
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
            </div >

            {/* Calculate button */}
            < motion.button
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
            </motion.button >


          </motion.div >

          {/* Output Card - Shows current or archived result */}
          < motion.div variants={scrollEnterItemVariants} >
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
          </motion.div >
        </motion.section>
      </motion.div >
    </div >
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

  const { ref: mainRef, replay: replayMain } = useScramble({
    text: truncated ?? value,
    speed: 0.6,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 0,
  });

  const { ref: fullRef, replay: replayFull } = useScramble({
    text: value,
    speed: 0.6,
    tick: 1,
    step: 1,
    scramble: 4,
    seed: 0,
  });

  // Replay animation when value changes
  useEffect(() => {
    replayMain();
    if (truncated) {
      replayFull();
    }
  }, [value, truncated, replayMain, replayFull]);

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
      <div className="flex items-baseline gap-[2px]">
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
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="shrink-0 cursor-pointer"
          style={{ color: '#1d1c1c' }}
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </motion.button>
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
