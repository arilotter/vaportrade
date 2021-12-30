import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import {
  connectorsByName,
  connectorsIconsByName,
  getConnectorErrorMessage,
  resetWalletConnector,
} from "./connectors";
import { useInactiveListener } from "./hooks";
import loadingIcon from "../icons/loadingIcon.gif";
import { Web3Provider } from "@ethersproject/providers";
import { AbstractConnector } from "@web3-react/abstract-connector";
import { ButtonForm, DetailsSection, Window } from "packard-belle";
import "./WalletSignin.css";
import rebootIcon from "../icons/reboot.png";
import controlPanelIcon from "../icons/controlPanel.png";
import warningIcon from "../icons/warning.png";
import vaportradeLogo from "../icons/vticon.png";
import { ControlPanel } from "../ControlPanel";
interface WalletSigninProps {
  children: JSX.Element;
}

export function WalletSignin({ children }: WalletSigninProps) {
  const {
    connector,
    activate,
    active,
    deactivate,
    error,
  } = useWeb3React<Web3Provider>();

  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [cachedError, setCachedError] = useState<Error | null>(null);

  // handle logic to recognize the connector currently being activated
  const [
    activatingConnector,
    setActivatingConnector,
  ] = useState<AbstractConnector>();
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector]);

  // if we hit an error, disconnect.
  useEffect(() => {
    if (activatingConnector && error) {
      setCachedError(error);
      resetWalletConnector(activatingConnector);
      deactivate();
    }
  }, [error, active, deactivate, activatingConnector]);

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!!activatingConnector);

  if (active) {
    return children;
  }
  return (
    <div className="modal">
      {controlPanelOpen ? (
        <ControlPanel onClose={() => setControlPanelOpen(false)} />
      ) : (
        <Window
          title="Connect your web3 wallet"
          className="web3Modal"
          icon={vaportradeLogo}
        >
          <div style={{ textAlign: "center", padding: "8px 8px 0 8px" }}>
            <img
              className="walletConnectButtonLogo"
              width={32}
              height={32}
              src={warningIcon}
              alt={"Warning!"}
            />
            <h3>WARNING</h3>
            <p>
              <strong>VAPORTRADE.NET IS IN BETA.</strong>
            </p>
            <p>
              While it doesn't do anything novel on-chain & it uses
              battle-tested contracts, it could still be buggy.
              <br />
              Until it's gotten some more use and eyeballs on it, you shouldn't
              trade with people you don't know.
            </p>
            <p>
              <strong>
                VAPORTRADE.NET IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
              </strong>
            </p>
            <p>
              vaportrade.net uses peer-to-peer (p2p) communication via WebRTC.
            </p>
            <p>
              Your IP address and wallet address will be published to other
              vaportrade.net users so you can trade.
            </p>
            <p>
              If you aren't okay with this,
              <br />
              <strong>DO NOT CONNECT YOUR WALLET.</strong>
            </p>
            <p>
              Otherwise, continue by picking a wallet connection method below.
            </p>
          </div>
          {(Object.keys(connectorsByName) as Array<
            keyof typeof connectorsByName
          >).map((name) => {
            const currentConnector = connectorsByName[name];
            const activating = currentConnector === activatingConnector;
            const connected = currentConnector === connector;
            const disabled = !!activatingConnector || connected || !!error;

            return (
              <div key={name}>
                <ButtonForm
                  isDisabled={disabled}
                  className="walletConnectButton"
                  onClick={() => {
                    setCachedError(null);
                    setActivatingConnector(currentConnector);
                    activate(connectorsByName[name]);
                  }}
                >
                  {activating && <img src={loadingIcon} alt="Loading..." />}
                  <img
                    className="walletConnectButtonLogo"
                    width={16}
                    height={16}
                    src={connectorsIconsByName[name]}
                    alt={`${name} logo`}
                  />

                  {name}
                </ButtonForm>
              </div>
            );
          })}
          {cachedError ? (
            <div className="walletConnectError">
              <DetailsSection title="Error">
                {getConnectorErrorMessage(cachedError)}
              </DetailsSection>
            </div>
          ) : null}
          <hr />
          <div className="walletConnectButton">
            <ButtonForm
              className="walletConnectButton"
              onClick={() => setControlPanelOpen(true)}
            >
              <img
                className="walletConnectButtonLogo"
                width={16}
                height={16}
                src={controlPanelIcon}
                alt="Control Panel"
              />
              Control Panel
            </ButtonForm>
            <ButtonForm
              className="walletConnectButton"
              onClick={() => window.location.reload()}
            >
              <img
                className="walletConnectButtonLogo"
                width={16}
                height={16}
                src={rebootIcon}
                alt="Reboot"
              />
              Reload
            </ButtonForm>
          </div>
        </Window>
      )}
    </div>
  );
}
