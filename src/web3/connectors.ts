import { SequenceConnector } from "./Web3ReactSequenceConnector";
import {
  InjectedConnector,
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from "@web3-react/injected-connector";
import {
  WalletConnectConnector,
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
} from "@web3-react/walletconnect-connector";
import { UnsupportedChainIdError } from "@web3-react/core";
import { AbstractConnector } from "@web3-react/abstract-connector";

import sequenceIcon from "./sequence.png";
import walletConnectIcon from "./walletconnect.png";
import metamaskIcon from "./metamask.png";
import { chainConfigs, supportedChains } from "../utils/multichain";
import { ChainId } from "@0xsequence/network";
import { config } from "../settings";

export const sequence = new SequenceConnector({
  supportedChainIds: supportedChains.slice(),
  connectOptions: {
    app: "vaportrade.net",
    networkId:
      config.testnetModeSetMeToTheStringTrue === "true"
        ? ChainId.POLYGON_MUMBAI
        : ChainId.POLYGON,
  },
});

export const injected = new InjectedConnector({
  supportedChainIds: supportedChains.slice(),
});

const walletconnect = new WalletConnectConnector({
  rpc: Object.fromEntries(
    Object.entries(chainConfigs).map(([chainID, config]) => [
      chainID,
      config.rpcUrl,
    ])
  ),
  qrcode: true,
});

export enum ConnectorName {
  Sequence = "Sequence",
  Injected = "Browser Extension (usually MetaMask)",
  WalletConnect = "WalletConnect",
}

export const connectorsByName: {
  [connectorName in ConnectorName]: AbstractConnector;
} = {
  [ConnectorName.Sequence]: sequence,
  [ConnectorName.Injected]: injected,
  [ConnectorName.WalletConnect]: walletconnect,
};

export const connectorsIconsByName: {
  [connectorName in ConnectorName]: string;
} = {
  [ConnectorName.Sequence]: sequenceIcon,
  [ConnectorName.Injected]: metamaskIcon,
  [ConnectorName.WalletConnect]: walletConnectIcon,
};

export function getConnectorErrorMessage(error: Error) {
  if (error instanceof NoEthereumProviderError) {
    return "No web3 browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.";
  } else if (error instanceof UnsupportedChainIdError) {
    return `You're connected to an unsupported network. Switch to one of: ${supportedChains
      .map((id) => chainConfigs[id].title)
      .join(", ")}`;
  } else if (
    error instanceof UserRejectedRequestErrorInjected ||
    error instanceof UserRejectedRequestErrorWalletConnect
  ) {
    return "To use vaportrade.net, allow it to connect to your wallet.";
  } else {
    console.error(error);
    return "An unknown error occurred while connecting to your wallet. Reload and try again. Check the console for more details.";
  }
}

export function resetWalletConnector(connector: AbstractConnector | undefined) {
  if (connector) {
    if (connector instanceof WalletConnectConnector) {
      connector.walletConnectProvider = undefined;
    } else if (connector instanceof SequenceConnector) {
      connector.wallet = undefined;
    }
  }
}
export function isConnectorMultichain(
  connector: AbstractConnector | undefined
) {
  if (connector instanceof WalletConnectConnector) {
    return (
      connector.walletConnectProvider.connector._peerMeta.url ===
      "https://sequence.app"
    );
  } else if (connector instanceof SequenceConnector) {
    return true;
  } else {
    return false;
  }
}
