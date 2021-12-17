import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import {
  connectorsByName,
  connectorsIconsByName,
  getConnectorErrorMessage,
} from "./connectors";
import { useEagerConnect, useInactiveListener } from "./hooks";
import loadingIcon from "../icons/loadingIcon.gif";
import { Web3Provider } from "@ethersproject/providers";
import { AbstractConnector } from "@web3-react/abstract-connector";
import { ButtonForm, Window } from "packard-belle";

interface WalletSigninProps {
  children: JSX.Element;
}

export function WalletSignin({ children }: WalletSigninProps) {
  const context = useWeb3React<Web3Provider>();
  const { connector, activate, active, deactivate, error } = context;

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
    if (error) {
      setCachedError(error);
      deactivate();
    }
  }, [error, active, deactivate]);

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  if (active) {
    return children;
  }
  return (
    <div className="modal">
      <Window title="Connect your web3 wallet">
        {(Object.keys(connectorsByName) as Array<
          keyof typeof connectorsByName
        >).map((name) => {
          const currentConnector = connectorsByName[name];
          const activating = currentConnector === activatingConnector;
          const connected = currentConnector === connector;
          const disabled =
            !triedEager || !!activatingConnector || connected || !!error;

          return (
            <div>
              <ButtonForm
                isDisabled={disabled}
                className="walletConnectButton"
                key={name}
                onClick={() => {
                  setCachedError(null);
                  setActivatingConnector(currentConnector);
                  activate(connectorsByName[name]);
                }}
              >
                {activating && <img src={loadingIcon} alt="Loading..." />}
                <img
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
        <div>
          {!!cachedError && (
            <h4 style={{ marginTop: "1rem", marginBottom: "0" }}>
              {getConnectorErrorMessage(cachedError)}
            </h4>
          )}
        </div>
      </Window>
    </div>
  );
}
