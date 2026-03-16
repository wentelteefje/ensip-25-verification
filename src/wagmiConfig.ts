import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "ENSIP-25 Attestation",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "ENSIP25_INJECTED_ONLY",
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http("https://eth.drpc.org"),
    [sepolia.id]: http("https://sepolia.drpc.org"),
  },
});
