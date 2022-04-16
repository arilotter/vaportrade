import { ChainId, NetworkConfig } from "@0xsequence/network";
import { Indexer } from "@0xsequence/indexer";
import { config } from "../settings";

import ethereumIcon from "../icons/ethereum.png";
import rinkebyIcon from "../icons/rinkeby.png";
import polygonIcon from "../icons/polygon.webp";
import mumbaiIcon from "../icons/mumbai.png";
import { RpcRelayerOptions } from "@0xsequence/relayer";
import { BigNumber } from "@ethersproject/bignumber";
import { parseEther } from "@ethersproject/units";
import { Chain } from "@rainbow-me/rainbowkit";
import { RequiredNonNull } from "./utils";

const _supportedChains = [
  ChainId.MAINNET,
  ChainId.POLYGON,
  // testnets:
  ChainId.RINKEBY,
  ChainId.POLYGON_MUMBAI,
] as const;

export type SupportedChain = typeof _supportedChains[number];
const _checkChains: ReadonlyArray<ChainId> = _supportedChains;
void _checkChains;

export function isSupportedChain(id: number): id is SupportedChain {
  return _supportedChains.some((chainID) => id === chainID);
}

export type Indexers = { [K in SupportedChain]: Indexer };

const corsProxy = config.corsAnywhereUrl;

type VaportradeChain = Omit<NetworkConfig, "rpcUrl"> &
  RequiredNonNull<Chain> & {
    // make props non optional
    title: string;
    relayer: RpcRelayerOptions;
    indexerUrl: string;
    tradingWindowSeconds: number;
    protocolFee?: BigNumber;
    rpcUrl: string;
  };

const _chainConfigs: {
  [K in SupportedChain]: Omit<VaportradeChain, "id" | "chainId" | "rpcUrl">;
} = {
  "1": {
    name: "mainnet",
    title: "Ethereum",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: ["https://nodes.sequence.app/mainnet"],
    relayer: { url: `${corsProxy}https://mainnet-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://mainnet-indexer.sequence.app`,
    blockExplorers: [{ name: "Etherscan", url: "https://etherscan.io" }],
    iconUrl: ethereumIcon,
    testnet: false,
    tradingWindowSeconds: 15 * 60,
  },
  "137": {
    name: "polygon",
    title: "Polygon",
    nativeCurrency: {
      decimals: 18,
      name: "Polygon",
      symbol: "MATIC",
    },
    rpcUrls: [`${corsProxy}https://nodes.sequence.app/polygon`],
    relayer: { url: `${corsProxy}https://polygon-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://polygon-indexer.sequence.app`,
    isDefaultChain: true,
    isAuthChain: true,
    blockExplorers: [{ name: "Polygonscan", url: "https://polygonscan.com" }],
    iconUrl: polygonIcon,
    testnet: false,
    tradingWindowSeconds: 5 * 60,
  },
  4: {
    name: "rinkeby",
    title: "Rinkeby Testnet",
    nativeCurrency: {
      decimals: 18,
      name: "Rinkeby Test Ether",
      symbol: "rtETH",
    },
    rpcUrls: ["https://nodes.sequence.app/rinkeby"],
    relayer: { url: `${corsProxy}https://rinkeby-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://rinkeby-indexer.sequence.app`,
    blockExplorers: [
      { name: "Rinkeby Etherescan", url: "https://rinkeby.etherscan.io" },
    ],
    iconUrl: rinkebyIcon,
    testnet: true,
    tradingWindowSeconds: 15 * 60,
    // Rinkeby's 0x v3 has protocol fees, so give it a little eth to make it happy
    protocolFee: parseEther("0.01"),
  },
  80001: {
    name: "mumbai",
    title: "Mumbai Polygon Testnet",
    nativeCurrency: {
      decimals: 18,
      name: "Mumbai Test Matic",
      symbol: "mtMATIC",
    },
    rpcUrls: ["https://nodes.sequence.app/mumbai"],
    relayer: { url: `${corsProxy}https://mumbai-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://mumbai-indexer.sequence.app`,
    blockExplorers: [
      { name: "Mumbai Polygonscan", url: "https://mumbai.polygonscan.com" },
    ],
    iconUrl: mumbaiIcon,
    testnet: true,
    isAuthChain: true,
    isDefaultChain: true,
    tradingWindowSeconds: 5 * 60,
  },
};

export const chainConfigs = Object.fromEntries(
  Object.entries(_chainConfigs).map(([chainId, chain]) => {
    const id = Number.parseInt(chainId, 10);
    const vtChain: VaportradeChain = {
      chainId: id,
      id,
      rpcUrl: chain.rpcUrls[0],
      ...chain,
    };
    return [chainId, vtChain];
  })
) as {
  [K in SupportedChain]: Readonly<VaportradeChain>;
};

export const supportedChains = _supportedChains.filter(
  (chainID) =>
    chainConfigs[chainID].testnet ===
    (config.testnetModeSetMeToTheStringTrue === "true")
);

export const chainConfigList = Object.values(chainConfigs);
