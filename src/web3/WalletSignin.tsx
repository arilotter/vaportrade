import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import {
  ConnectorName,
  connectorsByName,
  connectorsIconsByName,
  getConnectorErrorMessage,
  resetWalletConnector,
} from "./connectors";
import { useEagerConnect, useInactiveListener } from "./hooks";
import loadingIcon from "../icons/loadingIcon.gif";
import { Web3Provider } from "@ethersproject/providers";
import { AbstractConnector } from "@web3-react/abstract-connector";
import { ButtonForm, DetailsSection, Window } from "packard-belle";
import "./WalletSignin.css";
import rebootIcon from "../icons/reboot.png";
import controlPanelIcon from "../icons/controlPanel.png";
import { config } from "../settings";
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

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  if (active) {
    return children;
  }
  return (
    <div className="modal">
      {controlPanelOpen ? (
        <ControlPanel onClose={() => setControlPanelOpen(false)} />
      ) : (
        <Window title="Connect your web3 wallet" className="web3Modal">
          {(Object.keys(connectorsByName) as Array<
            keyof typeof connectorsByName
          >)
            .filter(
              (name) =>
                name !== ConnectorName.Sequence ||
                config.debugModeSetMeToTheStringTrue === "true"
            )
            .map((name) => {
              const currentConnector = connectorsByName[name];
              const activating = currentConnector === activatingConnector;
              const connected = currentConnector === connector;
              const disabled =
                !triedEager || !!activatingConnector || connected || !!error;

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
            Reload vaportrade.net
          </ButtonForm>
        </Window>
      )}
    </div>
  );
}
