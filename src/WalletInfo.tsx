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
import { useOnKeyDown } from "./utils/utils";

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
  useOnKeyDown("Escape", onClose);
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
        title="Wallet Info"
        icon={icon}
        onMinimize={onMinimize}
        onClose={onClose}
      >
        <h3 className="walletInfoContents">
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
          <ButtonForm onClick={disconnect}>Disconnect</ButtonForm>
        </h3>
        {address ? (
          <>
            <div className="walletInfoContents">
              <ProfileIcon seed={address} />
              <p>Your wallet address is {address}</p>
            </div>
            <div className="walletInfoContents">
              <WalletContentsBox
                className="walletInfoWalletContents"
                accountAddress={address}
                indexer={indexer}
                collectibles={collectibles}
                contracts={contracts}
                requestTokensFetch={requestTokensFetch}
                onItemSelected={() => {}}
                subtractItems={[]}
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
