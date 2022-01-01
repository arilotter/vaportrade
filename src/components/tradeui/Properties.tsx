import { Window } from "packard-belle";
import missingIcon from "./missing.png";
import warningIcon from "../../icons/warning.png";
import { ContractType, useOnKeyDown } from "../../utils/utils";
import { verifiedContracts } from "../../utils/verified";
import "./Properties.css";
import { chainConfigs, SupportedChain } from "../../utils/multichain";
export interface PropertiesProps {
  name: string;
  contractAddress: string;
  iconUrl: string;
  type: ContractType;
  chainID: SupportedChain;
  tokenID?: string;
}

interface PropertiesWindowProps extends PropertiesProps {
  onClose: () => void;
  onMinimize: () => void;
}
export function Properties({
  name,
  contractAddress,
  iconUrl,
  type,
  chainID,
  tokenID,
  onClose,
  onMinimize,
}: PropertiesWindowProps) {
  useOnKeyDown("Escape", onClose);
  return (
    <div className="modal">
      <Window
        onClose={onClose}
        onMinimize={onMinimize}
        title={`${name} Properties`}
        icon={iconUrl || missingIcon}
      >
        <div className="propsImage">
          <img src={iconUrl || missingIcon} alt={name} />
        </div>
        <div className="propsProp">
          <span>Name:</span>
          {name}
        </div>
        <div className="propsProp">
          <span>Type:</span>
          {type === undefined || typeof type === "string"
            ? type
            : `Unsupported: ${type.other}`}
        </div>
        <div className="propsProp">
          <span>Contract Address:</span>
          <a
            href={`${chainConfigs[chainID].explorerUrl}/token/${contractAddress}`}
          >
            {contractAddress}
          </a>
        </div>
        {tokenID && type !== "ERC20" ? (
          <div className="propsProp">
            <span>Token ID:</span>
            {tokenID}
          </div>
        ) : null}
        {verifiedContracts[chainID].has(contractAddress) ? (
          <div className="propsProp">
            <p style={{ maxWidth: "315px" }}>
              This token's Contract Address has been verified by vaportrade.net.
            </p>
            <p>
              When you trade verified tokens, you can be sure
              <br />
              they're not fake tokens with the same image & name.
            </p>
            <p>
              For more info about this verified token, go to{" "}
              <a href={verifiedContracts[chainID].get(contractAddress)}>
                {verifiedContracts[chainID].get(contractAddress)}
              </a>
            </p>
          </div>
        ) : (
          <div className="propsProp">
            <img src={warningIcon} alt="NOT VERIFIED WARNING" />
            <p>
              This token is <strong>NOT</strong>verified.
            </p>
            <p>
              It could be a lesser-known token, but it also could be a fake
              token
              <br /> using the same name and icon as a real one.
            </p>
            <p>
              <strong>DO NOT</strong> accept this token in trades, unless you're
              sure that the Contract Address
              <br /> matches the Contract Address of the token you're asking
              for.
            </p>
            <p>
              If this is your token & you'd like to be verified, send me an
              e-mail or Twitter DM (see credits).
            </p>
          </div>
        )}
      </Window>
    </div>
  );
}
