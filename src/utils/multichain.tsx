import { ChainId, NetworkConfig } from "@0xsequence/network";
import { Indexer } from "@0xsequence/indexer";
import { config } from "../settings";

import ethereumIcon from "../icons/ethereum.png";
import rinkebyIcon from "../icons/rinkeby.png";
import polygonIcon from "../icons/polygon.webp";
import mumbaiIcon from "../icons/mumbai.png";
import { RpcRelayerOptions } from "@0xsequence/relayer";

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

export type Indexers = { [K in SupportedChain]: Indexer };

const corsProxy = config.corsAnywhereUrl;

export const chainConfigs: {
  [K in SupportedChain]: Readonly<
    Omit<NetworkConfig, "chainId"> & {
      // extras!
      explorerUrl: string;
      iconUrl: string;
      // make props non optional
      title: string;
      testnet: boolean;
      rpcUrl: string;
      relayer: RpcRelayerOptions;
      indexerUrl: string;
      tradingWindowSeconds: number;
    }
  >;
} = {
  "1": {
    name: "mainnet",
    title: "Ethereum",
    rpcUrl: `https://nodes.sequence.app/mainnet`,
    relayer: { url: `${corsProxy}https://mainnet-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://mainnet-indexer.sequence.app`,
    explorerUrl: "https://etherscan.io/",
    iconUrl: ethereumIcon,
    testnet: false,
    tradingWindowSeconds: 15 * 60,
  },
  "137": {
    name: "polygon",
    title: "Polygon",
    rpcUrl: `https://nodes.sequence.app/polygon`,
    relayer: { url: `${corsProxy}https://polygon-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://polygon-indexer.sequence.app`,
    isDefaultChain: true,
    isAuthChain: true,
    explorerUrl: "https://polygonscan.com/",
    iconUrl: polygonIcon,
    testnet: false,
    tradingWindowSeconds: 5 * 60,
  },
  4: {
    name: "rinkeby",
    title: "Rinkeby Testnet",
    rpcUrl: `https://nodes.sequence.app/rinkeby`,
    relayer: { url: `${corsProxy}https://rinkeby-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://rinkeby-indexer.sequence.app`,
    explorerUrl: "https://rinkeby.etherscan.io/",
    iconUrl: rinkebyIcon,
    testnet: true,
    tradingWindowSeconds: 15 * 60,
  },
  80001: {
    name: "mumbai",
    title: "Mumbai Polygon Testnet",
    rpcUrl: `https://nodes.sequence.app/mumbai`,
    relayer: { url: `${corsProxy}https://mumbai-relayer.sequence.app` },
    indexerUrl: `${corsProxy}https://mumbai-indexer.sequence.app`,
    explorerUrl: "https://mumbai.polygonscan.com/",
    iconUrl: mumbaiIcon,
    testnet: true,
    isAuthChain: true,
    isDefaultChain: true,
    tradingWindowSeconds: 5 * 60,
  },
};
export const supportedChains = _supportedChains.filter(
  (chainID) =>
    chainConfigs[chainID].testnet ===
    (config.testnetModeSetMeToTheStringTrue === "true")
);
