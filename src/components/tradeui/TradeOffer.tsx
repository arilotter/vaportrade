import { ChainId } from "@0xsequence/network";
import { useDrop } from "react-dnd";
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
  onItemDropped?: (item: Item<KnownContractType>) => void;
}
export function TradeOffer({
  items,
  onItemSelected,
  mine,
  onItemDropped,
}: TradeOfferProps) {
  const [{ canDrop, isHovering }, drop] = useDrop(() => ({
    accept: mine
      ? DragItemType.MY_ITEM_IN_WALLET
      : DragItemType.THEIR_ITEM_IN_WALLET,
    drop: onItemDropped,
    collect: (monitor) => ({
      canDrop: !!monitor.canDrop(),
      isHovering: !!monitor.isOver() && !!monitor.canDrop(),
    }),
  }));
  return (
    <div className="tradeOffer">
      <div className="itemBoxContainer" ref={drop}>
        <div
          className={`itemBox ${canDrop ? "itemBoxCanDrop" : ""} ${
            isHovering ? "itemBoxIsHovering" : ""
          }`}
        >
          {[...items]
            // sort assets with icons first :)
            // really should sort by price tho
            .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
            .map((item) => (
              <DraggableIcon
                dragItemType={
                  mine
                    ? DragItemType.MY_ITEM_IN_TRADE
                    : DragItemType.THEIR_ITEM_IN_TRADE
                }
                item={item}
                key={getTokenKey(
                  ChainId.POLYGON,
                  item.contractAddress,
                  item.tokenID
                )}
                onDoubleClick={
                  onItemSelected ? () => onItemSelected(item) : () => {}
                }
              />
            ))}
        </div>
      </div>
    </div>
  );
}
