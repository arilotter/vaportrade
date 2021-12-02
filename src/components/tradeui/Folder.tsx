import { ExplorerIcon } from "packard-belle";
import folderBg from "./folder_bg.png";
import folderFg from "./folder_fg.png";

interface FolderProps {
  name: string;
  address: string;
  iconUrl: string;
  onFolderOpen: () => void;
}

export function Folder({ name, address, iconUrl, onFolderOpen }: FolderProps) {
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
          left: "13px",
          top: "3px",
        }}
      />
      <img
        src={iconUrl}
        alt=""
        width="24"
        style={{
          position: "absolute",
          left: "18px",
        }}
      />
      <ExplorerIcon
        onDoubleClick={onFolderOpen}
        alt={`${name} (${address})`}
        icon={folderFg}
        title={name}
      />
    </div>
  );
}
