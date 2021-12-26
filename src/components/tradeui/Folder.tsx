import { ExplorerIcon } from "packard-belle";
import folderBg from "./folder_bg.png";
import folderFg from "./folder_fg.png";

interface FolderProps {
  name: string;
  address: string;
  iconUrl: string;
  type: "ERC721" | "ERC1155";
  onFolderOpen: () => void;
}

export function Folder({
  name,
  address,
  iconUrl,
  type,
  onFolderOpen,
}: FolderProps) {
  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <img
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
        onDoubleClick={onFolderOpen}
        alt={`${name} (${address})`}
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
    </div>
  );
}
