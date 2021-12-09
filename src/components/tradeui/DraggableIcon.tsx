import { ExplorerIcon } from "packard-belle";
import { useDrag } from "react-dnd";
import {
  balanceToFixedNumber,
  ContractType,
  DragItemType,
  Item,
} from "../../utils/utils";
import missingIcon from "./missing.png";
import "./DraggableIcon.css";
import { BigNumber } from "@0x/utils";

interface DraggableIconProps {
  item: Item<ContractType>;
  onDoubleClick: () => void;
  isDisabled?: boolean;
}

export function DraggableIcon({
  item,
  onDoubleClick,
  isDisabled,
}: DraggableIconProps) {
  // TODO Drag & Drop
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragItemType.MY_ITEM,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  const decimalBalance = balanceToFixedNumber(
    item.balance,
    item.decimals
  ).toString();

  const title = `${
    new BigNumber(decimalBalance.split(".")[0]).gt(1_000_000_000)
      ? "a lot of"
      : addNumberCommas(decimalBalance)
  }\n${item.name}`;

  return (
    <div
      className={isDisabled ? "disabledIcon" : ""}
      ref={drag}
      style={{
        opacity: isDragging ? 0.25 : 1,
        cursor: "move",
        position: "relative",
      }}
    >
      <ExplorerIcon
        onDoubleClick={isDisabled ? () => {} : onDoubleClick}
        alt={`${decimalBalance} ${item.name} (${item.contractAddress})`}
        icon={item.iconUrl || missingIcon}
        title={title}
      />
      {typeof item.type === "string" ? (
        <div
          style={{
            fontSize: "50%",
            position: "absolute",
            textAlign: "right",
            top: "30px",
            right: "6px",
            width: "auto",
            padding: "1px",
            color: "white",
            background: "black",
            pointerEvents: "none",
          }}
        >
          {item.type}
        </div>
      ) : null}
    </div>
  );
}

function addNumberCommas(number: string) {
  const [whole, fractional] = number.split(".");
  const fractionalStripped =
    fractional && fractional.length && fractional !== "0"
      ? `.${fractional.slice(0, 5)}`
      : "";
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
