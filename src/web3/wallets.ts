import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import {
  chainConfigList,
  chainConfigs,
  SupportedChain,
} from "../utils/multichain";
import { SequenceConnector } from "./Web3ReactSequenceConnector";
import sequenceIcon from "./sequence.svg";
export const walletGroups = getDefaultWallets({
  chains: chainConfigList,
  appName: "vaportrade.net",
  jsonRpcUrl: ({ chainId }) =>
    ((chainId && chainConfigs[chainId as SupportedChain]) || chainConfigs[1])
      .rpcUrl,
});
walletGroups.unshift({
  groupName: "Suggested",
  wallets: [
    {
      createConnector: ({ chainId }) => {
        const connector = new SequenceConnector({
          options: {
            provider: {
              defaultNetworkId: chainId,
            },
            connect: {
              app: "vaportrade.net",
              networkId: chainId,
              origin: "https://vaportrade.net",
            },
          },
        });
        return {
          connector,
        };
      },
      iconUrl: sequenceIcon,
      id: "sequence",
      name: "Sequence",
      installed: true,
      shortName: "Sequence",
      downloadUrls: {
        android: "https://sequence.app",
        browserExtension: "https://sequence.app",
        ios: "https://sequence.app",
        qrCode: "https://sequence.app",
      },
    },
  ],
});

export const wallets = walletGroups.flatMap((g) => g.wallets);
