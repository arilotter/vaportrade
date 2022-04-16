import { mainnetNetworks, testnetNetworks } from "@0xsequence/network";
import type {
  ConnectOptions,
  ProviderConfig,
  Web3Provider,
} from "@0xsequence/provider";
import { Wallet } from "@0xsequence/provider";
import { Chain } from "@rainbow-me/rainbowkit";
import {
  Connector,
  ConnectorData,
  ConnectorNotFoundError,
  UserRejectedRequestError,
} from "wagmi";
import { chainConfigList } from "../utils/multichain";
interface Options {
  provider?: Partial<ProviderConfig>;
  connect?: ConnectOptions;
}

export class SequenceConnector extends Connector<
  Web3Provider,
  Options | undefined
> {
  id = "sequence";
  name = "Sequence";
  chains = chainConfigList;
  ready = true;
  #provider: Web3Provider | null = null;
  #wallet: Wallet;
  #connected = false;
  constructor({ chains, options }: { chains?: Chain[]; options?: Options }) {
    super({ chains, options });
    if ((window as any).__sequenceWallet) {
      this.#wallet = (window as any).__sequenceWallet;
    } else {
      this.#wallet = new Wallet(
        this.options?.provider?.defaultNetworkId,
        this.options?.provider
      );
      (window as any).__sequenceWallet = this.#wallet;
    }
  }
  async connect(): Promise<ConnectorData<Web3Provider>> {
    if (!this.#wallet.isConnected()) {
      const e = await this.#wallet.connect(this.options?.connect);
      if (e.error) {
        throw new UserRejectedRequestError(e.error);
      }
    }
    const chainId = await this.getChainId();
    const provider = this.getProvider();
    const account = await this.getAccount();
    // provider.on("accountsChanged", this.onAccountsChanged);
    // provider.on("chainChanged", this.onChainChanged);
    provider.on("disconnect", this.onDisconnect);
    this.#connected = true;
    return {
      account,
      chain: {
        id: chainId,
        unsupported: this.isChainUnsupported(chainId),
      },
      provider,
    };
  }
  async disconnect() {
    this.#wallet.disconnect();
  }
  getAccount() {
    return this.#wallet.getAddress();
  }
  getChainId() {
    return this.#wallet.getChainId();
  }
  getProvider() {
    if (!this.#provider) {
      const provider = this.#wallet.getProvider();
      if (!provider) {
        throw new ConnectorNotFoundError(
          "Failed to get Sequence Wallet provider."
        );
      }
      this.#provider = provider;
    }
    return this.#provider;
  }
  async getSigner() {
    return this.#wallet.getSigner();
  }
  async isAuthorized() {
    try {
      const account = await this.getAccount();
      return !!account;
    } catch {
      return false;
    }
  }
  protected onAccountsChanged = (accounts: string[]) => {};
  protected onChainChanged = (chain: number | string) => {};
  protected onDisconnect = () => {
    this.emit("disconnect");
  };
  isChainUnsupported(chainId: number): boolean {
    return !(
      mainnetNetworks.some((c) => c.chainId === chainId) ||
      testnetNetworks.some((c) => c.chainId === chainId)
    );
  }
}
