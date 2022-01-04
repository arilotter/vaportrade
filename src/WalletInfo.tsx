import { connectorsByName, connectorsIconsByName } from "./web3/connectors";
import { ButtonForm, Window } from "packard-belle";
import { useContext, useEffect, useState } from "react";
import { ProfileIcon } from "./components/ProfileIcon";
import { WalletContentsBox } from "./components/tradeui/WalletContentsBox";
import "./WalletInfo.css";
import {
  chainConfigs,
  SupportedChain,
  supportedChains,
} from "./utils/multichain";
import { ChainPicker } from "./utils/ChainPicker";
import reloadIcon from "./icons/reload.png";
import { PropertiesContext } from "./utils/context";
import { useWeb3React } from "@web3-react/core";
import { Web3Provider } from "@0xsequence/provider";

interface WalletInfoProps {
  onMinimize: () => void;
  onClose: () => void;
  defaultChain?: SupportedChain;
}
export function WalletInfo({
  onMinimize,
  onClose,
  defaultChain,
}: WalletInfoProps) {
  const { connector, deactivate } = useWeb3React<Web3Provider>();
  const { openPropertiesWindow } = useContext(PropertiesContext);

  const [address, setAddress] = useState<string | null>(null);
  const [chainID, setChainID] = useState<SupportedChain>(
    defaultChain ||
      supportedChains.find((chain) => chainConfigs[chain].isAuthChain)!
  );
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    connector?.getAccount().then(setAddress);
  }, [connector, setAddress]);
  const name = (Object.keys(connectorsByName) as Array<
    keyof typeof connectorsByName
  >).find((c) => connectorsByName[c] === connector)!;
  const icon = connectorsIconsByName[name];

  return (
    <div className="modal">
      <Window
        title="My Wallet"
        icon={icon}
        onMinimize={onMinimize}
        onClose={onClose}
        className="walletInfoWindow"
      >
        {address ? (
          <>
            <h3 className="walletInfoContents">
              <ProfileIcon seed={address} />
              <img
                src={icon}
                style={{
                  width: "32px",
                  height: "32px",
                  padding: "8px",
                }}
                alt={`${name} logo`}
              />
              Connected to {name}
              <ButtonForm onClick={deactivate} className="walletInfoButton">
                Disconnect
              </ButtonForm>
            </h3>
            <div className="walletInfoContents">
              <p>Your wallet address is {address}</p>
              <ButtonForm
                className="walletInfoButton"
                onClick={() => navigator.clipboard.writeText(address)}
              >
                Copy
              </ButtonForm>
            </div>
            <div
              style={{
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <ButtonForm
                className="refreshButton"
                onClick={() => {
                  setReloadNonce(reloadNonce + 1);
                }}
              >
                <div>
                  <img src={reloadIcon} alt="Refresh" height={16} />
                  Refresh Wallet
                </div>
              </ButtonForm>
              <div>
                Chain: <ChainPicker chain={chainID} setChain={setChainID} />
              </div>
            </div>
            <div
              className="walletInfoContents"
              style={{
                flex: "1",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <WalletContentsBox
                chainID={chainID}
                className="walletInfoWalletContents"
                accountAddress={address}
                mine
                onItemSelected={openPropertiesWindow}
                isInTrade={false}
                reloadNonce={reloadNonce}
              />
            </div>
          </>
        ) : (
          <div className="walletInfoContents error">Failed to load address</div>
        )}
      </Window>
    </div>
  );
}
