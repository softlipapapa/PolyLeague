import { erc20Abi, formatUnits, formatEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/providers/WalletContext";
import {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  WETH_CONTRACT_ADDRESS,
  WETH_DECIMALS,
} from "@/constants/tokens";
import { QUERY_STALE_TIMES, QUERY_REFETCH_INTERVALS } from "@/constants/query";

export interface TokenBalance {
  symbol: string;
  balance: number;
  formatted: string;
  usdValue: number;
}

async function fetchEthPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.ethereum?.usd ?? 0;
  } catch {
    return 0;
  }
}

async function fetchMaticPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd"
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data["matic-network"]?.usd ?? 0;
  } catch {
    return 0;
  }
}

export default function usePolygonBalances(address: string | undefined) {
  const { publicClient } = useWallet();

  const { data, isLoading, error } = useQuery({
    queryKey: ["polygon-balances", address],
    queryFn: async () => {
      if (!address || !publicClient) return null;

      const addr = address as `0x${string}`;

      // Fetch all balances + prices in parallel
      const [usdceRaw, usdcRaw, wethRaw, maticRaw, ethPrice, maticPrice] =
        await Promise.all([
          publicClient.readContract({
            address: USDC_E_CONTRACT_ADDRESS,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addr],
          }),
          publicClient.readContract({
            address: USDC_CONTRACT_ADDRESS,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addr],
          }),
          publicClient.readContract({
            address: WETH_CONTRACT_ADDRESS,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addr],
          }),
          publicClient.getBalance({ address: addr }),
          fetchEthPrice(),
          fetchMaticPrice(),
        ]);

      const usdce = parseFloat(formatUnits(usdceRaw, USDC_E_DECIMALS));
      const usdc = parseFloat(formatUnits(usdcRaw, USDC_DECIMALS));
      const weth = parseFloat(formatUnits(wethRaw, WETH_DECIMALS));
      const matic = parseFloat(formatEther(maticRaw));

      const tokens: TokenBalance[] = [
        { symbol: "USDC.e", balance: usdce, formatted: usdce.toFixed(2), usdValue: usdce },
        { symbol: "USDC", balance: usdc, formatted: usdc.toFixed(2), usdValue: usdc },
        { symbol: "WETH", balance: weth, formatted: weth.toFixed(6), usdValue: weth * ethPrice },
        { symbol: "POL", balance: matic, formatted: matic.toFixed(4), usdValue: matic * maticPrice },
      ];

      const totalUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);

      return { tokens, totalUsd };
    },
    enabled: !!address && !!publicClient,
    staleTime: QUERY_STALE_TIMES.BALANCE,
    refetchInterval: QUERY_REFETCH_INTERVALS.BALANCE,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const tokens = data?.tokens ?? [];
  const nonZeroTokens = tokens.filter((t) => t.balance > 0.0001);
  const totalUsd = data?.totalUsd ?? 0;

  // Keep backward compatibility
  const usdceToken = tokens.find((t) => t.symbol === "USDC.e");

  return {
    tokens: nonZeroTokens,
    totalUsd,
    formattedTotal: totalUsd.toFixed(2),
    // Legacy fields
    usdcBalance: usdceToken?.balance ?? 0,
    formattedUsdcBalance: usdceToken?.formatted ?? "0.00",
    rawUsdcBalance: null,
    isLoading,
    isError: !!error,
  };
}
