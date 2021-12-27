import { AbstractConnector } from "@web3-react/abstract-connector";
import { connectorsByName, connectorsIconsByName } from "./web3/connectors";
import { ButtonForm, Window } from "packard-belle";
import { useEffect, useState } from "react";
import { ProfileIcon } from "./components/ProfileIcon";
import { WalletContentsBox } from "./components/tradeui/WalletContentsBox";
import { sequence } from "0xsequence";
import {
  CollectiblesDB,
  ContractsDB,
  FetchableToken,
} from "./components/tradeui/contracts";
import "./WalletInfo.css";

interface WalletInfoProps {
  connector: AbstractConnector;
  disconnect: () => void;

  onMinimize: () => void;
  onClose: () => void;

  indexer: sequence.indexer.Indexer;
  collectibles: CollectiblesDB;
  contracts: ContractsDB;
  requestTokensFetch: (tokens: FetchableToken[]) => void;
}
export function WalletInfo({
  connector,
  collectibles,
  contracts,
  indexer,
  onMinimize,
  onClose,
  disconnect,
  requestTokensFetch,
}: WalletInfoProps) {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    connector.getAccount().then(setAddress);
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
              <ButtonForm onClick={disconnect} className="walletInfoButton">
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
                className="walletInfoWalletContents"
                accountAddress={address}
                indexer={indexer}
                collectibles={collectibles}
                contracts={contracts}
                requestTokensFetch={requestTokensFetch}
                mine={true}
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
