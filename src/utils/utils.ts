import { ChainId } from "@0xsequence/network";
import { ethers } from "ethers";
import { Peer, Tracker } from "p2pt";
import { useEffect } from "react";

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

export const DragItemType = {
  MY_ITEM: "my_item",
  THEIR_ITEM: "their_item",
};

export interface Item {
  address: string;
  name: string;
  balance: ethers.FixedNumber;
  tokenId: string;
  iconUrl: string;
  originalBalance: ethers.FixedNumber;
}

export interface TradingPeer {
  peer: Peer;
  address: string;
  tradeRequest: boolean;
  hasNewInfo: boolean;
}

export function isTradingPeer(peer: Peer | TradingPeer): peer is TradingPeer {
  return "tradeRequest" in peer;
}

export function useOnKeyDown(key: "Escape", callback: () => void) {
  return useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === key) {
        callback();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [key, callback]);
}
