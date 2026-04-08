import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { polygon } from "@reown/appkit/networks";
import { POLYGON_RPC_URL } from "@/constants/polymarket";

export const WALLETCONNECT_PROJECT_ID = "9cfcc3777d3dab94048208e101cb199e";

export const wagmiAdapter = new WagmiAdapter({
  projectId: WALLETCONNECT_PROJECT_ID,
  networks: [polygon],
  transports: {
    [polygon.id]: POLYGON_RPC_URL as any,
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
