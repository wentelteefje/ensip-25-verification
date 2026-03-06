"use client";
/**
 * DemoAnimation — Non-interactive, self-cycling demo of the ENSIP-25
 * Agent Registry Attestation verification tool. Designed for blog embedding.
 * Rotates through hard-coded scenarios with animated input reveals and results.
 *
 * Fully self-contained: all colors are hardcoded hex values (ENS citrine/
 * azure/quartz palette). No external CSS variables required.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, type Variants } from "motion/react";
import { useScramble } from "use-scramble";

// --- Color constants (ENS citrine/azure/quartz palette) ---------------------

const C = {
  white: "#ffffff",
  bg: "#faf9f7",
  border: "#eeeded",
  muted: "#a1a1a1",
  text: "#191919",
  peridot: "#007c20",
  peridotBg: "#d1eedf",
  magenta: "#ed2496",
  magentaBg: "#fce4ec",
} as const;

// --- Animation config -------------------------------------------------------

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
};

const dotVariants: Variants = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};

const scrollEnterVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const scrollEnterItemVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.3, ease: AC.EASE },
  },
};

// --- Inline SVG icons -------------------------------------------------------

const ICON_SIZE = 24;
type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

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

// --- Color theme -------------------------------------------------------------

type ColorTheme = "citrine" | "azure" | "peridot";

function getColorBg(color: ColorTheme) {
  if (color === "azure") return "#e1f5fe";
  if (color === "citrine") return C.magentaBg;
  if (color === "peridot") return C.peridotBg;
  return C.bg;
}

function getColorMain(color: ColorTheme) {
  if (color === "azure") return "#0082bb";
  if (color === "citrine") return C.magenta;
  if (color === "peridot") return C.peridot;
  return C.text;
}

// --- Demo scenario data -----------------------------------------------------

interface AgentFileResult {
  type: "valid" | "invalid" | "not-set" | "error";
  endpoint?: string;
  message?: string;
}

interface DemoScenario {
  ensName: string;
  agentId: string;
  registryLabel: string;
  registryValue: string;
  textRecordKey: string;
  textRecordValue: string | null;
  registryAddress: string;
  agentFileResult: AgentFileResult;
  ensAvatar: string | undefined;
  colorTheme: ColorTheme;
}

const SCENARIOS: DemoScenario[] = [
  {
    ensName: "ens-registration-agent.ses.eth",
    agentId: "26433",
    registryLabel: "8004 @ Ethereum Mainnet",
    registryValue: "0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432",
    textRecordKey: "agent-registration[0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432][26433]",
    textRecordValue: "1",
    registryAddress: "0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432",
    agentFileResult: { type: "valid", endpoint: "ens-registration-agent.ses.eth" },
    ensAvatar: "https://euc.li/ens-registration-agent.ses.eth",
    colorTheme: "citrine",
  },
  {
    ensName: "workemon.eth",
    agentId: "1432",
    registryLabel: "8004 @ Ethereum Sepolia",
    registryValue: "0x0001000003aa36a7148004a818bfb912233c491871b3d84c89a494bd9e",
    textRecordKey: "agent-registration[0x0001000003aa36a7148004a818bfb912233c491871b3d84c89a494bd9e][1432]",
    textRecordValue: null,
    registryAddress: "0x0001000003aa36a7148004a818bfb912233c491871b3d84c89a494bd9e",
    agentFileResult: { type: "valid", endpoint: "workemon.eth" },
    ensAvatar: "https://euc.li/sepolia/workemon.eth",
    colorTheme: "azure",
  },
  {
    ensName: "gregskril.eth",
    agentId: "42",
    registryLabel: "8004 @ Base Mainnet",
    registryValue: "0x00010000022105148004a169fb4a3325136eb29fa0ceb6d2e539a432",
    textRecordKey: "agent-registration[0x00010000022105148004a169fb4a3325136eb29fa0ceb6d2e539a432][42]",
    textRecordValue: "1",
    registryAddress: "0x00010000022105148004a169fb4a3325136eb29fa0ceb6d2e539a432",
    agentFileResult: { type: "not-set", message: "Agent not found in registry" },
    ensAvatar: "https://metadata.ens.domains/sepolia/avatar/gregskril.eth",
    colorTheme: "peridot",
  },
];

// --- Cycle phases -----------------------------------------------------------

type CyclePhase =
  | "idle"       // waiting for user to press play
  | "inputs"     // scramble-reveal inputs
  | "loading"    // brief loading dots
  | "results"    // results card content updated
  | "hold";      // hold results on screen

// --- Component --------------------------------------------------------------

export default function DemoAnimation() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [phase, setPhase] = useState<CyclePhase>("idle");
  const [playing, setPlaying] = useState(false);
  const scenario = SCENARIOS[scenarioIdx];
  const colorTheme = scenario.colorTheme;

  // Input scramble text — pre-filled with first scenario for idle display
  const [inputEns, setInputEns] = useState(SCENARIOS[0].ensName);
  const [inputAgent, setInputAgent] = useState(SCENARIOS[0].agentId);
  const [ensScrambleDone, setEnsScrambleDone] = useState(false);

  // The scenario whose results are currently displayed in the card.
  // null = card not yet shown (first cycle).
  const [displayedScenario, setDisplayedScenario] = useState<DemoScenario | null>(null);

  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => {
      if (!prev) {
        // Starting or resuming — if idle, kick off loading (inputs already visible)
        if (phase === "idle") setPhase("loading");
        return true;
      }
      // Pausing — timer cleanup happens via effect
      return false;
    });
  }, [phase]);

  // Drive phase transitions — only advance when playing
  useEffect(() => {
    clearPhaseTimer();

    if (!playing || phase === "idle") return;

    switch (phase) {
      case "inputs":
        // Start input scramble — card stays visible with previous data
        setEnsScrambleDone(false);
        setInputEns(scenario.ensName);
        setInputAgent(scenario.agentId);
        phaseTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setPhase("loading");
        }, 1200);
        break;

      case "loading":
        phaseTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setDisplayedScenario(scenario);
            setPhase("results");
          }
        }, 1500);
        break;

      case "results":
        phaseTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setPhase("hold");
        }, 500);
        break;

      case "hold":
        phaseTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setScenarioIdx((i) => (i + 1) % SCENARIOS.length);
            setPhase("inputs");
          }
        }, 5000);
        break;
    }

    return clearPhaseTimer;
  }, [phase, playing, scenario, clearPhaseTimer]);

  const { ref: ensRef } = useScramble({
    text: inputEns,
    speed: 0.8,
    tick: 1,
    step: 2,
    scramble: 2,
    seed: 0,
    onAnimationEnd: () => setEnsScrambleDone(true),
  });

  const { ref: agentRef } = useScramble({
    text: inputAgent,
    speed: 0.8,
    tick: 1,
    step: 2,
    scramble: 2,
    seed: 0,
  });

  const isLoading = phase === "loading";
  const ds = displayedScenario;
  const hasAttestation = ds ? ds.textRecordValue !== null : false;

  return (
    <div className="not-prose w-full bg-[#ffffff] rounded-xl border border-black/5 antialiased flex items-center justify-center relative overflow-hidden py-16 my-8">
      {/* Background pattern */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{ opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="ensip25-grid" x="0" y="0" width="320" height="200" patternUnits="userSpaceOnUse">
              <g clipPath="url(#ensip25-clip)">
                <path d="M2 6C2 2.68629 4.68629 0 8 0H32C35.3137 0 38 2.68629 38 6V34C38 37.3137 35.3137 40 32 40H8C4.68629 40 2 37.3137 2 34V6Z" fill="white" />
                <path d="M46 38C42.6863 38 40 35.3137 40 32V8C40 4.68629 42.6863 2 46 2H74C77.3137 2 80 4.68629 80 8V32C80 35.3137 77.3137 38 74 38H46Z" fill="rgba(0,0,0,0.03)" />
                <path d="M82 6C82 2.68629 84.6863 0 88 0H112C115.314 0 118 2.68629 118 6V34C118 37.3137 115.314 40 112 40H88C84.6863 40 82 37.3137 82 34V6Z" fill="white" />
                <path d="M126 38C122.686 38 120 35.3137 120 32V8C120 4.68629 122.686 2 126 2H154C157.314 2 160 4.68629 160 8V32C160 35.3137 157.314 38 154 38H126Z" fill="rgba(0,0,0,0.03)" />
              </g>
              <clipPath id="ensip25-clip">
                <rect width="320" height="200" fill="white" />
              </clipPath>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ensip25-grid)" />
        </svg>
      </motion.div>

      <motion.div
        className="w-full max-w-[600px] mx-auto px-4 z-10"
        variants={scrollEnterVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2, margin: "-80px" }}
      >
        {/* Header */}
        <motion.div className="mb-6 text-center mx-auto flex flex-col items-center gap-0" variants={scrollEnterItemVariants}>
          <span className="inline-block mb-2 text-[12px] font-medium tracking-[0.48px] uppercase text-[#a1a1a1] font-mono">
            ENSIP-25
          </span>
          <div className="flex items-center justify-center gap-[8px]">
            <motion.button
              onClick={handlePlayPause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center shrink-0 aspect-square p-1.5 rounded-[5px] cursor-pointer"
              style={{ backgroundColor: getColorBg(colorTheme) }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <IconPause size={16} style={{ color: getColorMain(colorTheme) }} />
              ) : (
                <IconPlay size={16} style={{ color: getColorMain(colorTheme) }} />
              )}
            </motion.button>
            <h1 className="text-[32px] sm:text-[37.8px] font-bold tracking-[-0.756px] leading-[normal] font-sans" style={{ color: getColorMain(colorTheme) }}>
              Agent Registry Attestation
            </h1>
          </div>
          <p className="mt-2 text-[12px] font-medium tracking-[0.24px] text-[#a1a1a1] max-w-[360px] font-mono">
            Verify bidirectional attestations between ENS names and agent identities registered in ERC-8004 agent registries.
          </p>
        </motion.div>

        <motion.section className="place-content-start flex flex-col max-w-[500px] mx-auto">
          {/* Row 1 label */}
          <div className="mb-[2px]">
            <span className="text-[11px] font-medium uppercase tracking-[0.48px] opacity-70 text-[#a1a1a1] font-mono">
              ENS NAME
            </span>
          </div>
          {/* Row 1: ENS Name */}
          <motion.div className="flex items-center justify-center gap-[6px] mb-[5px] min-h-[31px]" variants={scrollEnterItemVariants}>
            {/* ENS Name display pill */}
            <div className="relative bg-[#faf9f7] border border-[#eeeded] rounded-[3px] px-2 h-full flex items-center min-w-0 flex-1">
              <div className="relative w-full">
                {/* Scramble text (hidden once done, overlay takes over) */}
                <span
                  ref={ensRef}
                  className="text-[16px] sm:text-[18px] font-bold whitespace-nowrap inline-block min-w-[60px] min-h-[1.5em] font-sans"
                  style={{
                    color: ensScrambleDone ? 'transparent' : C.text,
                  }}
                />
                {/* Colored .eth overlay — shown after scramble completes */}
                {ensScrambleDone && inputEns.includes('.eth') && (
                  <div
                    className="absolute inset-0 pointer-events-none text-[16px] sm:text-[18px] font-bold whitespace-pre flex font-sans"
                    aria-hidden="true"
                  >
                    <span className="text-[#191919]">{inputEns.split('.eth')[0]}</span>
                    <span style={{ color: getColorMain(colorTheme) }}>.eth</span>
                  </div>
                )}
              </div>
              {isLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      variants={dotVariants}
                      initial="initial"
                      animate="animate"
                      className="inline-block h-1 w-1 rounded-full"
                      style={{ backgroundColor: getColorMain(colorTheme) }}
                      transition={{ delay: i * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Row 2: Agent ID + Registry (label+input columns that wrap together) */}
          <motion.div className="flex flex-wrap items-end justify-start gap-[6px] mb-[5px]" variants={scrollEnterItemVariants}>
            {/* Agent ID column */}
            <div className="flex flex-col w-[100px]">
              <span className="text-[11px] font-medium uppercase tracking-[0.48px] opacity-70 text-[#a1a1a1] font-mono mb-[2px]">
                AGENT ID
              </span>
              <div className="relative bg-[#faf9f7] border border-[#eeeded] rounded-[3px] px-2 flex items-center min-w-0 min-h-[31px]">
                <span
                  ref={agentRef}
                  className="text-[16px] sm:text-[18px] font-bold text-[#191919] whitespace-nowrap inline-block min-w-[60px] min-h-[1.5em] font-sans"
                />
              </div>
            </div>

            {/* Separator diamond — hidden when row wraps on small screens */}
            <div className="hidden sm:flex items-center justify-center shrink-0 w-[5.759px] h-[5.514px] mb-[12px]">
              <div className="rotate-45" style={{ transform: 'rotate(45deg)' }}>
                <div className="w-[5px] h-[5px] rounded-[1px]" style={{ backgroundColor: getColorMain(colorTheme) }} />
              </div>
            </div>

            {/* Registry column */}
            <div className="flex flex-col flex-1 min-w-[120px]">
              <span className="text-[11px] font-medium uppercase tracking-[0.48px] opacity-70 text-[#a1a1a1] font-mono mb-[2px]">
                REGISTRY
              </span>
              <div className="relative bg-[#faf9f7] border border-[#eeeded] rounded-[3px] px-1.5 flex items-center gap-[7.6px] min-h-[31px] overflow-visible">
                <div className="relative flex items-center pr-4 flex-1 min-h-[23px] overflow-visible">
                  <span className="text-[16px] sm:text-[18px] font-bold text-[#191919] whitespace-normal font-sans">
                    {scenario.registryLabel}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Output Card — always present once first results appear */}
          {ds && (
            <motion.div
              variants={resultVariants}
              initial="hidden"
              animate="visible"
              className="mt-4 bg-[#faf9f7] border border-[#eeeded] rounded-[3px] px-[9px] py-[10px]"
            >
              <div className="pt-1">
                <OutputRow
                  label="ENS NAME"
                  value={ds.ensName}
                  accentColor={ds.colorTheme}
                  avatar={ds.ensAvatar}
                />
              </div>
              <div className="pt-3">
                <OutputRow
                  label="ERC-7930 ENCODED REGISTRY ADDRESS"
                  value={ds.registryAddress}
                  mono
                  accentColor={ds.colorTheme}
                  scrambleStep={3}
                />
              </div>
              <div className="pt-3">
                <OutputRow
                  label="TEXT RECORD KEY"
                  value={ds.textRecordKey}
                  mono
                  accent
                  accentColor={ds.colorTheme}
                  scrambleStep={3}
                />
              </div>
              <div className="pt-3">
                <OutputRow
                  label="ATTESTATION (ENS → AGENT)"
                  value={hasAttestation ? ds.textRecordValue! : "no attestation found"}
                  mono
                  accentColor={ds.colorTheme}
                />
              </div>
              <div className="pt-3">
                <AgentFileRow result={ds.agentFileResult} accentColor={ds.colorTheme} />
              </div>
              <div className="pt-3 pb-1">
                <VerificationLoopRow
                  ensToAgent={hasAttestation}
                  agentToEns={ds.agentFileResult.type === "valid"}
                  accentColor={ds.colorTheme}
                />
              </div>
            </motion.div>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}

// --- Agent file row sub-component -------------------------------------------

function AgentFileRow({ result, accentColor }: { result: AgentFileResult; accentColor: ColorTheme }) {
  let displayValue: string;
  let valueColor: string;

  switch (result.type) {
    case "valid":
      displayValue = `${result.endpoint} — Valid`;
      valueColor = getColorMain(accentColor);
      break;
    case "invalid":
      displayValue = `${result.endpoint} — Invalid`;
      valueColor = C.magenta;
      break;
    case "not-set":
      displayValue = "Name not set";
      valueColor = C.muted;
      break;
    case "error":
      displayValue = result.message ?? "Error";
      valueColor = C.muted;
      break;
  }

  return (
    <OutputRow
      label="REGISTRATION (AGENT → ENS)"
      value={displayValue}
      mono
      accentColor={accentColor}
      customValueColor={valueColor}
      noCopy
    />
  );
}

// --- Verification loop sub-component ----------------------------------------

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
    valueColor = getColorMain(accentColor);
  } else if (ensToAgent) {
    displayValue = "ENS → Agent only";
    valueColor = C.muted;
  } else if (agentToEns) {
    displayValue = "Agent → ENS only";
    valueColor = C.muted;
  } else {
    displayValue = "Open — no verification in either direction";
    valueColor = C.muted;
  }

  return (
    <OutputRow
      label="VERIFICATION LOOP"
      value={displayValue}
      accentColor={accentColor}
      customValueColor={valueColor}
      noCopy
    />
  );
}

// --- Output row sub-component -----------------------------------------------

function OutputRow({
  label,
  value,
  mono,
  accent,
  accentColor,
  customValueColor,
  avatar,
  scrambleStep,
  noCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  accentColor: ColorTheme;
  customValueColor?: string;
  avatar?: string;
  scrambleStep?: number;
  noCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const { ref: mainRef, replay: replayMain } = useScramble({
    text: value,
    speed: 0.6,
    tick: 1,
    step: scrambleStep ?? 1,
    scramble: 4,
    seed: 0,
    onAnimationEnd: () => setTextRevealed(true),
  });

  useEffect(() => {
    setTextRevealed(false);
    replayMain();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only replay on data change
  }, [value]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[11px] font-medium uppercase tracking-[0.48px] opacity-70 text-[#a1a1a1] font-mono">
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
          className={`text-[14px] sm:text-[16px] tracking-[-0.32px] break-all ${mono ? 'font-mono' : 'font-sans'}`}
          style={{
            color: customValueColor ?? (accent ? getColorMain(accentColor) : C.text)
          }}
          title={value}
        />
        {textRevealed && value && !noCopy && (
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
            className="shrink-0 cursor-pointer inline-flex items-center justify-center text-[#a1a1a1] hover:text-[#191919] transition-colors"
          >
            <span style={{ transform: 'scale(0.9)' }}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
