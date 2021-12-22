import { AbstractConnector } from "@web3-react/abstract-connector";
import { connectorsByName, connectorsIconsByName } from "./web3/connectors";
import { ButtonForm, Window } from "packard-belle";
import { useEffect, useState } from "react";
import { ProfileIcon } from "./components/ProfileIcon";
import "./WalletInfo.css";

interface WalletInfoProps {
  connector: AbstractConnector;
  disconnect: () => void;
  onMinimize: () => void;
  onClose: () => void;
}
export function WalletInfo({
  connector,
  onMinimize,
  onClose,
  disconnect,
}: WalletInfoProps) {
  const [address, setAddress] = useState("");
  useEffect(() => {
    connector
      .getAccount()
      .then((addr) => setAddress(addr ?? "unable to load address"));
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
        <h2 className="walletInfoContents">
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
        </h2>
        <div className="walletInfoContents">
          <ProfileIcon seed={address} />
          <p>Your wallet address is {address}</p>
        </div>
        <div className="walletInfoContents">
          <ButtonForm onClick={disconnect}>Disconnect Wallet</ButtonForm>
        </div>
      </Window>
    </div>
  );
}
