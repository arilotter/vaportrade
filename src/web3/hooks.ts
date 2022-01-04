import { useEffect } from "react";
import { useWeb3React } from "@web3-react/core";

import { injected } from "./connectors";
import { Web3Provider } from "@ethersproject/providers";

export function useInactiveListener(suppress: boolean = false) {
  const { active, error, activate } = useWeb3React();

  useEffect(() => {
    const { ethereum } = window as any;
    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleChainChanged = (chainId: string | number) => {
        console.log("Handling 'chainChanged' event with payload", chainId);
        activate(injected);
      };
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Handling 'accountsChanged' event with payload", accounts);
        if (accounts.length > 0) {
          activate(injected);
        }
      };
      const handleNetworkChanged = (networkId: string | number) => {
        console.log("Handling 'networkChanged' event with payload", networkId);
        activate(injected);
      };

      ethereum.on("chainChanged", handleChainChanged);
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("networkChanged", handleNetworkChanged);

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("chainChanged", handleChainChanged);
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("networkChanged", handleNetworkChanged);
        }
      };
    }
  }, [active, error, suppress, activate]);
}

export function useOnNetworkChanged() {
  const {
    active,
    error,
    activate,
    library,
    connector,
  } = useWeb3React<Web3Provider>();

  useEffect(() => {
    if (library && connector && !error) {
      const handleChainChanged = (chainId: string | number) => {
        console.log("Handling 'chainChanged' event with payload", chainId);
        activate(connector);
      };
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Handling 'accountsChanged' event with payload", accounts);
        if (accounts.length > 0) {
          activate(connector);
        }
      };
      const handleNetworkChanged = (networkId: string | number) => {
        console.log("Handling 'networkChanged' event with payload", networkId);
        activate(connector);
      };

      library.on("chainChanged", handleChainChanged);
      library.on("accountsChanged", handleAccountsChanged);
      library.on("networkChanged", handleNetworkChanged);

      return () => {
        library.removeListener("chainChanged", handleChainChanged);
        library.removeListener("accountsChanged", handleAccountsChanged);
        library.removeListener("networkChanged", handleNetworkChanged);
      };
    }
  }, [active, error, activate, library, connector]);
}
