import { encodeFunctionData } from "viem";
import { erc20Abi } from "viem";
import {
  PUSD_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  USDC_E_CONTRACT_ADDRESS,
} from "@/constants/tokens";
import type { DepositWalletCall } from "@polymarket/builder-relayer-client";

const PUSD_WRAP_ABI = [
  {
    name: "wrap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_asset", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_callbackReceiver", type: "address" },
      { name: "_data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export function getAssetAddress(symbol: "USDC" | "USDC.e"): `0x${string}` {
  return symbol === "USDC" ? USDC_CONTRACT_ADDRESS : USDC_E_CONTRACT_ADDRESS;
}

export function createConvertToPusdCalls(
  assetAddress: `0x${string}`,
  recipientAddress: `0x${string}`,
  amount: bigint
): DepositWalletCall[] {
  const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [PUSD_CONTRACT_ADDRESS as `0x${string}`, amount],
  });

  const wrapData = encodeFunctionData({
    abi: PUSD_WRAP_ABI,
    functionName: "wrap",
    args: [
      assetAddress,
      recipientAddress,
      amount,
      "0x0000000000000000000000000000000000000000" as `0x${string}`,
      "0x" as `0x${string}`,
    ],
  });

  return [
    { target: assetAddress, value: "0", data: approveData },
    { target: PUSD_CONTRACT_ADDRESS, value: "0", data: wrapData },
  ];
}
