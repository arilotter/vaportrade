import { ExplorerIcon } from "packard-belle";
import { useDrag } from "react-dnd";
import {
  balanceToFixedNumber,
  ContractType,
  DragItemType,
  Item,
} from "../../utils/utils";
import missingIcon from "./missing.png";
import warningIcon from "../../icons/warning.png";
import "./DraggableIcon.css";
import { BigNumber } from "ethers";
import { useCallback, useContext, MouseEvent } from "react";
import { verifiedContracts } from "../../utils/verified";
import { PropertiesContext, RightClickMenuContext } from "../../utils/context";

interface DraggableIconProps {
  item: Item<ContractType>;
  onDoubleClick: () => void;
  isDisabled?: boolean;
  dragItemType: typeof DragItemType[keyof typeof DragItemType];
  menuOptions?: ContextMenuOptions[];
}

export function DraggableIcon({
  item,
  onDoubleClick,
  isDisabled,
  dragItemType,
  menuOptions,
}: DraggableIconProps) {
  const { setContextMenu } = useContext(RightClickMenuContext);
  const { openPropertiesWindow } = useContext(PropertiesContext);
  const onContext = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setContextMenu({
        x: e.pageX,
        y: e.pageY,
        menuOptions: [
          ...(menuOptions ? [...menuOptions, "divider" as const] : []),
          {
            title: "Properties",
            onClick: () => openPropertiesWindow(item),
          },
        ],
      });
    },
    [menuOptions, setContextMenu, openPropertiesWindow, item]
  );
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: dragItemType,
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
      item,
    }),
    [dragItemType]
  );
  const decimalBalance = balanceToFixedNumber(
    item.balance,
    item.decimals
  ).toString();

  const title = `${
    item.type === "ERC721"
      ? "" // ERC721s are unique, so there's no point in balances for them
      : BigNumber.from(decimalBalance.split(".")[0]).gt(1_000_000_000)
      ? "a lot of"
      : addNumberCommas(decimalBalance)
  }\n${
    item.type === "ERC721" ||
    item.type === "ERC1155" ||
    item.symbol.length === 0
      ? item.name
      : item.symbol
  }`;

  return (
    <div
      className={isDisabled ? "disabledIcon" : ""}
      ref={drag}
      style={{
        opacity: item.balance.isZero() ? 0.5 : isDragging ? 0.25 : 1,
        cursor: "move",
        position: "relative",
      }}
      onContextMenu={onContext}
    >
      <ExplorerIcon
        onDoubleClick={isDisabled ? () => {} : onDoubleClick}
        alt={`${decimalBalance} ${item.name} (${item.contractAddress})`}
        icon={item.iconUrl || missingIcon}
        title={title}
      />
      <div
        style={{
          position: "absolute",
          top: "21px",
          left: "8px",
          padding: "1px",
          pointerEvents: "none",
        }}
      >
        {!verifiedContracts[item.chainID].has(item.contractAddress) ? (
          <img
            src={warningIcon}
            alt="Unverified Token!"
            style={{
              width: "16px",
            }}
          />
        ) : null}
      </div>
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
      ? `.${fractional.slice(0, fractional.lastIndexOf("0") + 5)}`
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
