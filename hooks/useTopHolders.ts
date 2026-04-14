import { useQuery } from "@tanstack/react-query";

export interface Holder {
  proxyWallet: string;
  name: string;
  pseudonym: string;
  bio: string;
  amount: number;
  outcomeIndex: number;
  profileImage: string;
  profileImageOptimized: string;
  displayUsernamePublic: boolean;
}

export interface TokenHolders {
  token: string;
  holders: Holder[];
}

interface UseTopHoldersOptions {
  conditionId: string | null;
  enabled?: boolean;
  limit?: number;
}

export default function useTopHolders({
  conditionId,
  enabled = true,
  limit = 10,
}: UseTopHoldersOptions) {
  return useQuery({
    queryKey: ["top-holders", conditionId, limit],
    queryFn: async (): Promise<TokenHolders[]> => {
      const response = await fetch(
        `/api/top-holders?market=${conditionId}&limit=${limit}`
      );
      if (!response.ok) throw new Error("Failed to fetch top holders");
      return response.json();
    },
    enabled: enabled && !!conditionId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
