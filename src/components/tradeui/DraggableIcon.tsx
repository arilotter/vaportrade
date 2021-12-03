import { BigNumber } from "ethers";
import { ExplorerIcon } from "packard-belle";
import { useDrag } from "react-dnd";
import { DragItemType, Item } from "../../utils/utils";
import missingIcon from "./missing.png";

interface DraggableIconProps {
  item: Item;
  onDoubleClick: () => void;
}

export function DraggableIcon({ item, onDoubleClick }: DraggableIconProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragItemType.MY_ITEM,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  const title = `${
    BigNumber.from(item.balance.toString().split(".")[0]).gt(1_000_000_000)
      ? "a lot of"
      : addNumberCommas(item.balance.toString())
  }\n${item.name}`;

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
        onDoubleClick={onDoubleClick}
        alt={`${item.balance} ${item.name} (${item.address})`}
        icon={item.iconUrl || missingIcon}
        title={title}
      />
    </div>
  );
}

function addNumberCommas(number: string) {
  const [whole, fractional] = number.split(".");
  const fractionalStripped =
    fractional.length && fractional !== "0" ? `.${fractional.slice(0, 5)}` : "";
  return (
    whole
      .split("")
      .reverse()
      .reduce<string[]>(
        (a, e, i) => [
          ...a,
          e,
          ...(i < whole.length - 1 && i % 3 === 2 ? [","] : []),
        ],
        []
      )
      .reverse()
      .join("") + fractionalStripped
  );
}
