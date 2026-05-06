import { erc20Abi, formatUnits, formatEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/providers/WalletContext";
import {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  PUSD_CONTRACT_ADDRESS,
  PUSD_DECIMALS,
  WETH_CONTRACT_ADDRESS,
  WETH_DECIMALS,
} from "@/constants/tokens";
import { QUERY_STALE_TIMES, QUERY_REFETCH_INTERVALS } from "@/constants/query";

export interface TokenBalance {
  symbol: string;
  balance: number;
  formatted: string;
  usdValue: number;
  raw: bigint;
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

async function fetchBalancesForAddress(
  publicClient: any,
  address: `0x${string}`
): Promise<{ tokens: TokenBalance[]; totalUsd: number }> {
  const [usdceRaw, usdcRaw, pusdRaw, wethRaw, maticRaw, ethPrice, maticPrice] =
    await Promise.all([
      publicClient.readContract({
        address: USDC_E_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      publicClient.readContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      publicClient.readContract({
        address: PUSD_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      publicClient.readContract({
        address: WETH_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      publicClient.getBalance({ address }),
      fetchEthPrice(),
      fetchMaticPrice(),
    ]);

  const usdce = parseFloat(formatUnits(usdceRaw, USDC_E_DECIMALS));
  const usdc = parseFloat(formatUnits(usdcRaw, USDC_DECIMALS));
  const pusd = parseFloat(formatUnits(pusdRaw, PUSD_DECIMALS));
  const weth = parseFloat(formatUnits(wethRaw, WETH_DECIMALS));
  const matic = parseFloat(formatEther(maticRaw));

  const tokens: TokenBalance[] = [
    { symbol: "pUSD", balance: pusd, formatted: pusd.toFixed(2), usdValue: pusd, raw: pusdRaw },
    { symbol: "USDC.e", balance: usdce, formatted: usdce.toFixed(2), usdValue: usdce, raw: usdceRaw },
    { symbol: "USDC", balance: usdc, formatted: usdc.toFixed(2), usdValue: usdc, raw: usdcRaw },
    { symbol: "WETH", balance: weth, formatted: weth.toFixed(6), usdValue: weth * ethPrice, raw: wethRaw },
    { symbol: "POL", balance: matic, formatted: matic.toFixed(4), usdValue: matic * maticPrice, raw: maticRaw },
  ];

  const totalUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);
  return { tokens, totalUsd };
}

export default function usePolygonBalances(
  depositWalletAddress: string | undefined,
  eoaAddress?: string | undefined
) {
  const { publicClient } = useWallet();

  type BalanceResult = { tokens: TokenBalance[]; totalUsd: number };

  const { data, isLoading, error } = useQuery({
    queryKey: ["polygon-balances", depositWalletAddress, eoaAddress],
    queryFn: async (): Promise<{
      trading: BalanceResult | null;
      wallet: BalanceResult | null;
    } | null> => {
      if (!publicClient) return null;

      const dwAddr = depositWalletAddress as `0x${string}` | undefined;
      const eoaAddr = eoaAddress as `0x${string}` | undefined;

      const [tradingResult, walletResult] = await Promise.all([
        dwAddr ? fetchBalancesForAddress(publicClient, dwAddr) : null,
        eoaAddr && eoaAddr.toLowerCase() !== dwAddr?.toLowerCase()
          ? fetchBalancesForAddress(publicClient, eoaAddr)
          : null,
      ]);

      if (!tradingResult && !walletResult) return null;
      return { trading: tradingResult, wallet: walletResult };
    },
    enabled: !!(depositWalletAddress || eoaAddress) && !!publicClient,
    staleTime: QUERY_STALE_TIMES.BALANCE,
    refetchInterval: QUERY_REFETCH_INTERVALS.BALANCE,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const tradingTokens = data?.trading?.tokens ?? [];
  const walletTokens = data?.wallet?.tokens ?? [];
  const tradingNonZero = tradingTokens.filter((t) => t.balance > 0.0001);
  const walletNonZero = walletTokens.filter((t) => t.balance > 0.0001);
  const tradingTotal = data?.trading?.totalUsd ?? 0;
  const walletTotal = data?.wallet?.totalUsd ?? 0;

  const primaryToken =
    tradingTokens.find((t) => t.symbol === "pUSD" && t.balance > 0) ||
    tradingTokens.find((t) => t.symbol === "USDC.e" && t.balance > 0) ||
    tradingTokens.find((t) => t.symbol === "USDC" && t.balance > 0);

  return {
    tradingTokens: tradingNonZero,
    tradingTotal,
    formattedTradingTotal: tradingTotal.toFixed(2),
    walletTokens: walletNonZero,
    walletTotal,
    formattedWalletTotal: walletTotal.toFixed(2),
    primaryToken,
    // Combined total
    tokens: tradingNonZero,
    totalUsd: tradingTotal,
    formattedTotal: tradingTotal.toFixed(2),
    isLoading,
    isError: !!error,
  };
}
