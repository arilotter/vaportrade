import { Window } from "packard-belle";
import { ContractType, useOnKeyDown } from "../../utils/utils";
import "./Properties.css";
export interface PropertiesProps {
  name: string;
  contractAddress: string;
  iconUrl: string;
  type: ContractType;
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
        icon={iconUrl}
      >
        <div className="propsImage">
          <img src={iconUrl} alt={name} />
        </div>
        <div className="propsProp">
          <span>Name:</span>
          {name}
        </div>
        <div className="propsProp">
          <span>Type:</span>
          {type === undefined || typeof type === "string"
            ? type
            : `Unknown: ${type.other}`}
        </div>
        <div className="propsProp">
          <span>Contract Address:</span>
          <a href={`https://polygonscan.com/token/${contractAddress}`}>
            {contractAddress}
          </a>
        </div>
        {tokenID && type !== "ERC20" ? (
          <div className="propsProp">
            <span>Token ID:</span>
            {tokenID}
          </div>
        ) : null}
      </Window>
    </div>
  );
}
