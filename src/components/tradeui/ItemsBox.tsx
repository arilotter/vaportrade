import "./ItemsBox.css";
import { ExplorerIcon } from "packard-belle";

interface ItemsBoxProps {
  items: string[];
}
export function ItemsBox({ items }: ItemsBoxProps) {
  return (
    <div className="itemsBox">
      {items.map((item) => (
        <ExplorerIcon
          className="test"
          onDoubleClick={() => {
            console.log("addddddddd thing");
          }}
          alt={item}
          key={item}
          // icon={img}
          title={item}
        />
      ))}
    </div>
  );
}
