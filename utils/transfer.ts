import { DepositWalletCall } from "@polymarket/builder-relayer-client";
import { encodeFunctionData, erc20Abi } from "viem";
import { USDC_E_CONTRACT_ADDRESS } from "@/constants/tokens";

export interface TransferParams {
  recipient: `0x${string}`;
  amount: bigint;
  tokenAddress?: `0x${string}`;
}

export const createUsdcTransferCall = (
  params: TransferParams
): DepositWalletCall => {
  const { recipient, amount, tokenAddress } = params;

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, amount],
  });

  return {
    target: tokenAddress || USDC_E_CONTRACT_ADDRESS,
    value: "0",
    data,
  };
};
