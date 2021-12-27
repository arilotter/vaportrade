import { ChainId } from "@0xsequence/network";
import { NftSwap, Order, SignedOrder } from "@traderxyz/nft-swap-sdk";
import { BigNumber, ethers, FixedNumber } from "ethers";
import { Peer, Tracker } from "p2pt";
import { createContext, useEffect } from "react";
import { PropertiesProps } from "../components/tradeui/Properties";

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
  MY_ITEM_IN_WALLET: "my_item_in_wallet",
  MY_ITEM_IN_TRADE: "my_item_in_trade",
  THEIR_ITEM_IN_WALLET: "their_item_in_wallet",
  THEIR_ITEM_IN_TRADE: "their_item_in_trade",
};

export type KnownContractType = `ERC${20 | 721 | 1155}`;
export type ContractType = KnownContractType | { other: string };
export function isKnownContractType(s: string): s is KnownContractType {
  return s === "ERC20" || s === "ERC721" || s === "ERC1155";
}

export function isItemWithKnownContractType(
  item: Item<ContractType>
): item is Item<KnownContractType> {
  return typeof item.type === "string" && isKnownContractType(item.type);
}

export interface Item<CT extends ContractType> {
  type: CT;
  contractAddress: string;
  name: string;
  tokenID: string;
  iconUrl: string;
  balance: BigNumber;
  originalBalance: BigNumber;
  decimals: number;
}

export interface NetworkItem {
  type: KnownContractType;
  contractAddress: string;
  tokenID: string;
  balance: string; // bignumber
  originalBalance: string; // bignumber
}

function isNetworkItem(item: any): item is NetworkItem {
  if (typeof item !== "object") {
    return false;
  }
  if (
    !(
      item.type === "ERC20" ||
      item.type === "ERC721" ||
      item.type === "ERC1155"
    )
  ) {
    return false;
  }
  if (typeof item.contractAddress !== "string") {
    return false;
  }
  if (typeof item.tokenID !== "string") {
    return false;
  }
  try {
    BigNumber.from(item.balance);
    BigNumber.from(item.originalBalance);
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
  goesFirstAddress: string;
  myTradeOffer: Item<KnownContractType>[];
  tradeStatus:
    | { type: "negotiating" }
    | { type: "locked_in"; orderHash: string }
    | { type: "signedOrder"; signedOrder: SignedOrder };
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
      type: "set_goes_first";
      address: string;
    }
  | {
      type: "lockin";
      lockedOrder: false | { hash: string };
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
    Array.isArray(msg.offer) &&
    msg.offer.every(isNetworkItem)
  ) {
    return true;
  } else if (
    msg.type === "lockin" &&
    (msg.lockedOrder === false ||
      (typeof msg.lockedOrder === "object" &&
        typeof msg.lockedOrder.hash === "string"))
  ) {
    return true;
  } else if (msg.type === "set_goes_first" && typeof msg.address === "string") {
    return true;
  } else if (msg.type === "accept" && typeof msg.order === "object") {
    return true;
  } else if (msg.type === "chat" && typeof msg.message === "string") {
    return true;
  } else {
    return false;
  }
}
export interface OrderParticipant {
  address: string;
  items: Item<KnownContractType>[];
}

export function buildOrder(
  swap: NftSwap,
  participants: [OrderParticipant, OrderParticipant],
  goesFirstAddress: string,
  expiryTime: Date,
  fakeSalt: string
): Order {
  if (participants[0].address === participants[1].address) {
    throw new Error("Can't trade with yourself.");
  }

  const maker =
    goesFirstAddress === participants[0].address
      ? participants[0]
      : participants[1];
  const taker =
    goesFirstAddress === participants[0].address
      ? participants[1]
      : participants[0];
  return swap.buildOrder(
    maker.items.map(itemToSwapItem),
    taker.items.map(itemToSwapItem),
    maker.address,
    {
      takerAddress: taker.address,
      salt: fakeSalt,
      expiration: expiryTime,
    }
  );
}

export function itemToSwapItem(item: Item<KnownContractType>) {
  return {
    type: item.type,
    amount: item.balance.toString(), // bignumber as string
    tokenAddress: item.contractAddress,
    tokenId: item.tokenID,
  };
}

export function balanceToFixedNumber(
  balance: BigNumber,
  decimals: number
): FixedNumber {
  return FixedNumber.from(balance.toString()).divUnsafe(
    FixedNumber.from(ten.pow(decimals).toString())
  );
}

export function fixedNumberToBalance(
  num: FixedNumber,
  decimals: number
): BigNumber {
  const noDecimals = num.mulUnsafe(
    FixedNumber.from(ten.pow(decimals).toString())
  );
  const flooredRounded = noDecimals.floor().toString();
  if (flooredRounded !== noDecimals.toString()) {
    throw new Error(
      `Rounding error when converting FixedNumber to BigNumber! Expected ${flooredRounded}, but got ${noDecimals}`
    );
  }
  return BigNumber.from(noDecimals.toString().split(".")[0]);
}

export const ten = BigNumber.from(10);
export const two = BigNumber.from(2);
export const zero = BigNumber.from(0);

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export enum OrderStatus {
  Invalid,
  InvalidMakerAssetAmount,
  InvalidTakerAssetAmount,
  Fillable,
  Expired,
  FullyFilled,
  Cancelled,
}

export function formatTimeLeft(timeLeft: number): string {
  const minutes = `${Math.max(0, Math.floor((timeLeft % 3.6e6) / 6e4))}`;
  const seconds = `${Math.max(0, Math.floor((timeLeft % 6e4) / 1000))}`;
  return `${minutes}:${(seconds.length < 2 ? "0" : "") + seconds}`;
}

export interface Menu {
  x: number;
  y: number;
  menuOptions: Array<"divider" | ContextMenuOptions>;
}

export const RightClickMenuContext = createContext<{
  contextMenu: Menu | null;
  setContextMenu: (contextMenu: Menu) => void;
}>({
  setContextMenu: () => {},
  contextMenu: null,
});

export const PropertiesContext = createContext<{
  properties: PropertiesProps[];
  openPropertiesWindow: (props: PropertiesProps) => void;
  closePropertiesWindow: (props: PropertiesProps) => void;
}>({
  properties: [],
  openPropertiesWindow: () => {},
  closePropertiesWindow: () => {},
});
