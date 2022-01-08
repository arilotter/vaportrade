import { ExplorerIcon } from "packard-belle";
import { useCallback, MouseEvent, useContext } from "react";
import { PropertiesContext, RightClickMenuContext } from "../../utils/context";
import { SupportedChain } from "../../utils/multichain";
import { Address } from "../../utils/utils";
import { verifiedContracts } from "../../utils/verified";
import folderBg from "./folder_bg.png";
import folderFg from "./folder_fg.png";
import warningIcon from "../../icons/warning.png";

interface FolderProps {
  name: string;
  contractAddress: Address;
  iconUrl: string;
  type: "ERC721" | "ERC1155";
  chainID: SupportedChain;
  onFolderOpen: () => void;
}

export function Folder({
  name,
  contractAddress,
  iconUrl,
  type,
  chainID,
  onFolderOpen,
}: FolderProps) {
  const { setContextMenu } = useContext(RightClickMenuContext);
  const { openPropertiesWindow } = useContext(PropertiesContext);
  const onContext = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setContextMenu({
        x: e.pageX,
        y: e.pageY,
        menuOptions: [
          {
            title: "Open",
            onClick: onFolderOpen,
          },
          "divider" as const,
          {
            title: "Properties",
            onClick: () =>
              openPropertiesWindow({
                name,
                contractAddress,
                iconUrl,
                type,
                chainID,
              }),
          },
        ],
      });
    },
    [
      setContextMenu,
      onFolderOpen,
      openPropertiesWindow,
      contractAddress,
      iconUrl,
      name,
      type,
      chainID,
    ]
  );
  const isVerified = verifiedContracts[chainID].has(contractAddress);
  return (
    <div
      style={{
        position: "relative",
      }}
      onContextMenu={onContext}
    >
      <img
        className={!isVerified ? "unverifiedIcon" : ""}
        src={folderBg}
        alt=""
        width="32"
        style={{
          position: "absolute",
          left: "0",
          right: "0",
          margin: "0 auto",
          top: "3px",
          paddingLeft: "6px",
        }}
      />
      <img
        src={iconUrl}
        alt=""
        width="24"
        style={{
          position: "absolute",
          left: "0",
          right: "0",
          margin: "0 auto",
          paddingLeft: "9px",
          transform: "rotateZ(14deg) translateY(-1px)",
        }}
      />
      <ExplorerIcon
        className={!isVerified ? "unverifiedIcon" : ""}
        onDoubleClick={onFolderOpen}
        alt={`${name} (${contractAddress})`}
        icon={folderFg}
        title={name}
      />
      <div
        style={{
          fontSize: "50%",
          position: "absolute",
          textAlign: "center",
          top: "21px",
          left: "6px",
          right: "0",
          margin: "0 auto",
          pointerEvents: "none",
        }}
      >
        {type}
      </div>
      <div
        style={{
          position: "absolute",
          top: "21px",
          left: "8px",
          padding: "1px",
          pointerEvents: "none",
        }}
      >
        {!isVerified ? (
          <img
            src={warningIcon}
            alt="Unverified Token!"
            style={{
              width: "16px",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
