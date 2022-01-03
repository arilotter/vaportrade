import { useDrop } from "react-dnd";
import { itemSort } from "../../utils/tokensort";
import {
  DragItemType,
  getTokenKey,
  Item,
  KnownContractType,
} from "../../utils/utils";
import { DraggableIcon } from "./DraggableIcon";
import "./TradeOffer.css";

interface TradeOfferProps {
  items: Array<Item<KnownContractType>>;
  mine: boolean;
  onItemSelected?: (item: Item<KnownContractType>) => void;
  onRemoveFromTrade?: (item: Item<KnownContractType>) => void;
  onItemDropped?: (item: Item<KnownContractType>) => void;
}
export function TradeOffer({
  items,
  mine,
  onItemSelected,
  onRemoveFromTrade,
  onItemDropped,
}: TradeOfferProps) {
  const [{ canDrop, isHovering }, drop] = useDrop(
    () => ({
      accept: mine
        ? DragItemType.MY_ITEM_IN_WALLET
        : DragItemType.THEIR_ITEM_IN_WALLET,
      drop: onItemDropped,
      collect: (monitor) => ({
        canDrop: !!monitor.canDrop(),
        isHovering: !!monitor.isOver() && !!monitor.canDrop(),
      }),
    }),
    [mine, onItemDropped]
  );
  return (
    <div className="tradeOffer" onContextMenu={(ev) => ev.preventDefault()}>
      <div className="itemBoxContainer" ref={drop}>
        <div
          className={`itemBox ${canDrop ? "canDrop" : ""} ${
            isHovering ? "isHovering" : ""
          }`}
        >
          {[...items].sort(itemSort).map((item) => (
            <DraggableIcon
              dragItemType={
                mine
                  ? DragItemType.MY_ITEM_IN_TRADE
                  : DragItemType.THEIR_ITEM_IN_TRADE
              }
              item={item}
              key={getTokenKey(
                item.chainID,
                item.contractAddress,
                item.tokenID
              )}
              onDoubleClick={
                onItemSelected ? () => onItemSelected(item) : () => {}
              }
              menuOptions={[
                ...(onItemSelected && item.type !== "ERC721"
                  ? [
                      {
                        title: "Change Amount...",
                        onClick: () => onItemSelected(item),
                      },
                    ]
                  : []),
                ...(onRemoveFromTrade
                  ? [
                      {
                        title: "Remove from Trade",
                        onClick: () => onRemoveFromTrade(item),
                      },
                    ]
                  : []),
              ]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
