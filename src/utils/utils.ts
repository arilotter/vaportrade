import { ChainId } from "@0xsequence/network";
import { NftSwap } from "@traderxyz/nft-swap-sdk";
import { Order, SignedOrder } from "@traderxyz/nft-swap-sdk/dist/sdk/types";
import { BigNumber, ethers, FixedNumber } from "ethers";
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

// TODO Drag & Drop
export const DragItemType = {
  MY_ITEM: "my_item",
  THEIR_ITEM: "their_item",
};

export type ContractType = `ERC${20 | 721 | 1155}` | { other: string };
export function isKnownContractType(
  s: string
): s is Exclude<ContractType, { other: string }> {
  return s === "ERC20" || s === "ERC721" || s === "ERC1155";
}

export interface Item {
  type: ContractType;
  address: string;
  name: string;
  tokenID: string;
  iconUrl: string;
  balance: ethers.BigNumber;
  originalBalance: ethers.BigNumber;
  decimals: number;
}

export interface NetworkItem {
  address: string;
  tokenID: string;
  balance: string; // bignumber
  originalBalance: string; // bignumber
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
  chat: ChatMessage[];
}

export interface ChatMessage {
  chatter: "me" | "them";
  message: string;
}

export function isTradingPeer(peer: Peer | TradingPeer): peer is TradingPeer {
  return "tradeRequest" in peer;
}

export function useOnKeyDown(key: "Escape" | "Enter", callback: () => void) {
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
    }
  | {
      type: "lockin";
      isLocked: boolean;
      order: Order;
    }
  | {
      type: "accept";
      order: SignedOrder;
    }
  | { type: "chat"; message: string };

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
  } else if (msg.type === "chat" && typeof msg.message === "string") {
    return true;
  } else {
    return false;
  }
}

export function doIGoFirst(myAddress: string, theirAddress: string) {
  return BigNumber.from(myAddress).lt(BigNumber.from(theirAddress));
}

export function buildOrder(
  swap: NftSwap,
  participants: [
    { address: string; items: Item[] },
    { address: string; items: Item[] }
  ]
): Order {
  if (participants[0].address === participants[1].address) {
    throw new Error("Can't trade with yourself.");
  }

  const doesFirstParticipantGoFirst = doIGoFirst(
    participants[0].address,
    participants[1].address
  );

  const maker = doesFirstParticipantGoFirst ? participants[0] : participants[1];
  const taker = doesFirstParticipantGoFirst ? participants[1] : participants[0];
  return swap.buildOrder(
    maker.items.map(itemToSwapItem),
    taker.items.map(itemToSwapItem),
    maker.address
  );
}

function itemToSwapItem(item: Item) {
  if (typeof item.type === "object") {
    throw new Error(
      `Unknown contract type ${item.type.other} for item ${item.address} ${item.tokenID}`
    );
  }
  return {
    type: item.type,
    amount: item.balance.toString(), // TODO right number of decimals eek
    tokenAddress: item.address,
    tokenId: item.tokenID,
  };
}

export function balanceToFixedNumber(
  balance: BigNumber,
  decimals: number
): FixedNumber {
  return FixedNumber.from(balance.toString()).divUnsafe(
    FixedNumber.from(ten.pow(decimals))
  );
}

export function fixedNumberToBalance(
  num: FixedNumber,
  decimals: number
): BigNumber {
  const noDecimals = num.mulUnsafe(FixedNumber.from(ten.pow(decimals)));
  const flooredRounded = noDecimals.floor().toString();
  if (flooredRounded !== noDecimals.toString()) {
    throw new Error(
      `Rounding error when converting FixedNumber to BigNumber! Expected ${flooredRounded}, but got ${noDecimals}`
    );
  }
  return BigNumber.from(noDecimals.toString().split(".")[0]);
}

const ten = BigNumber.from(10);
