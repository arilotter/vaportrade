import { ChainId } from "@0xsequence/network";
import { getTokenKey, Item, KnownContractType } from "../../utils/utils";
import { DraggableIcon } from "./DraggableIcon";
import "./TradeOffer.css";

interface TradeOfferProps {
  items: Array<Item<KnownContractType>>;
  onItemSelected?: (item: Item<KnownContractType>) => void;
}
export function TradeOffer({ items, onItemSelected }: TradeOfferProps) {
  return (
    <div className="tradeOffer">
      <div className="itemBoxContainer">
        <div className="itemBox">
          {[...items]
            // sort assets with icons first :)
            // really should sort by price tho
            .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
            .map((item) => (
              <DraggableIcon
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
