import { ChainId } from "@0xsequence/network";
import { ethers, FixedNumber } from "ethers";
import { Peer, Tracker } from "p2pt";
import { useEffect } from "react";

export interface FailableTracker extends Tracker {
  failed: boolean;
}

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
  tokenID: string
) {
  return `${chainId}-${contractAddress.toLowerCase()}-${tokenID}` as const;
}
export type TokenKey = ReturnType<typeof getTokenKey>;

export const DragItemType = {
  MY_ITEM: "my_item",
  THEIR_ITEM: "their_item",
};

export interface Item {
  address: string;
  name: string;
  tokenID: string;
  iconUrl: string;
  balance: ethers.FixedNumber;
  originalBalance: ethers.FixedNumber;
}

export interface NetworkItem {
  address: string;
  tokenID: string;
  balance: string; // fixedNumber
  originalBalance: string; // fixedNumber
}

function isNetworkItem(item: any): item is NetworkItem {
  if (typeof item !== "object") {
    return false;
  }
  if (typeof item.address !== "string") {
    return false;
  }
  if (typeof item.tokenID !== "string") {
    return false;
  }
  try {
    FixedNumber.from(item.balance);
    FixedNumber.from(item.originalBalance);
  } catch {
    return false;
  }
  return true;
}

export interface TradingPeer {
  peer: Peer;
  address: string;
  tradeRequest: boolean;
  hasNewInfo: boolean;
  tradeOffer: NetworkItem[];
  offerAccepted: boolean;
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

export type VaportradeMessage =
  | {
      type: "address";
      address: string;
    }
  | {
      type: "trade_request";
    }
  | {
      type: "offer";
      offer: NetworkItem[];
      hash: string;
    }
  | {
      type: "lockin";
      isLocked: boolean;
      hash: string;
    }
  | {
      type: "accept";
      hash: string;
    };

export function isVaportradeMessage(msg: any): msg is VaportradeMessage {
  if (typeof msg !== "object") {
    return false;
  }
  if (!("type" in msg)) {
    return false;
  }
  if (msg.type === "address" && typeof msg.address === "string") {
    return true;
  } else if (msg.type === "trade_request") {
    return true;
  } else if (
    msg.type === "offer" &&
    typeof msg.hash === "string" &&
    Array.isArray(msg.offer) &&
    msg.offer.every(isNetworkItem)
  ) {
    return true;
  } else if (
    msg.type === "lockin" &&
    typeof msg.hash === "string" &&
    typeof msg.isLocked === "boolean"
  ) {
    return true;
  } else if (msg.type === "accept" && typeof msg.hash === "string") {
    return true;
  } else {
    return false;
  }
}
