import "./ItemsBox.css";
import { ExplorerIcon } from "packard-belle";
import missingIcon from "./missing.png";
interface ItemsBoxProps {
  items: Item[];
}

export interface Item {
  address: string;
  name: string;
  balance: string;
  iconUrl: string;
}
export function ItemsBox({ items }: ItemsBoxProps) {
  return (
    <div className="itemsBox">
      {[...items]
        // sort assets with icons first :)
        .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
        .map((item) => (
          <ExplorerIcon
            onDoubleClick={() => {
              console.log("addddddddd thing");
            }}
            alt={`${item.name} (${item.address})`}
            key={item.address}
            icon={item.iconUrl || missingIcon}
            title={item.name}
          />
        ))}
    </div>
  );
}
