import { services } from "../sequence/SequenceSessionProvider";
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

import walletConnectIcon from "./walletconnect.png";
import metamaskIcon from "./metamask.png";

export const injected = new InjectedConnector({
  supportedChainIds: [137],
});

const walletconnect = new WalletConnectConnector({
  rpc: { 137: services.nodes },
  qrcode: true,
  chainId: 137,
});

export enum ConnectorNames {
  Injected = "Browser Extension (usually MetaMask)",
  WalletConnect = "WalletConnect",
}

export const connectorsByName: {
  [connectorName in ConnectorNames]: AbstractConnector;
} = {
  [ConnectorNames.Injected]: injected,
  [ConnectorNames.WalletConnect]: walletconnect,
};

export const connectorsIconsByName: {
  [connectorName in ConnectorNames]: string;
} = {
  [ConnectorNames.Injected]: metamaskIcon,
  [ConnectorNames.WalletConnect]: walletConnectIcon,
};

export function getConnectorErrorMessage(error: Error) {
  if (error instanceof NoEthereumProviderError) {
    return "No web3 browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.";
  } else if (error instanceof UnsupportedChainIdError) {
    return "You're connected to an unsupported network. vaportrade.net only supports Polygon.";
  } else if (
    error instanceof UserRejectedRequestErrorInjected ||
    error instanceof UserRejectedRequestErrorWalletConnect
  ) {
    return "To use vaportrade.net, allow it to connect to your wallet.";
  } else {
    console.error(error);
    return "An unknown error occurred while connecting to your wallet. Check the console for more details.";
  }
}

export function resetWalletConnector(connector: AbstractConnector) {
  if (connector && connector instanceof WalletConnectConnector) {
    connector.walletConnectProvider = undefined;
  }
}
