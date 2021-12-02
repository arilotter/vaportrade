import { ExplorerIcon } from "packard-belle";
import { useDrag } from "react-dnd";
import { DragItemTypes, Item } from "../../utils/utils";
import missingIcon from "./missing.png";

interface DraggableIconProps {
  item: Item;
}

export function DraggableIcon({ item }: DraggableIconProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragItemTypes.WTF,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  const title = `${item.name} x ${item.balance}`;
  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.25 : 1,
        fontSize: 25,
        fontWeight: "bold",
        cursor: "move",
      }}
    >
      <ExplorerIcon
        onDoubleClick={() => {
          console.log("addddddddd thing");
        }}
        alt={`${title} (${item.address})`}
        icon={item.iconUrl || missingIcon}
        title={title}
      />
    </div>
  );
}
