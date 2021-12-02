import { ChainId } from "0xsequence/dist/declarations/src/network";
import { ethers } from "ethers";
import { Tracker } from "p2pt";

export interface FailableTracker extends Tracker {
  failed: boolean;
}

export const TRADE_REQUEST_MESSAGE = "tradeRequest";

export function normalizeAddress(address: string): string {
  return address === "0x0" ? address : ethers.utils.getAddress(address);
}

export function chunk<T>(originalArr: readonly T[], chunkSize: number) {
  const arr = [...originalArr];
  const chunks: T[][] = [];

  if (chunkSize < 1) {
    return chunks;
  }

  const chunkCount = Math.ceil(arr.length / chunkSize);

  for (let i = 0; i < chunkCount; i++) {
    chunks.push(arr.splice(0, chunkSize));
  }

  return chunks;
}

export function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}

export function getContractKey(chainId: ChainId, contractAddress: string) {
  return `${chainId}:${contractAddress.toLowerCase()}` as const;
}
export type ContractKey = ReturnType<typeof getContractKey>;

export function getTokenKey(
  chainId: ChainId,
  contractAddress: string,
  tokenId: string
) {
  return `${chainId}-${contractAddress.toLowerCase()}-${tokenId}` as const;
}
export type TokenKey = ReturnType<typeof getTokenKey>;
