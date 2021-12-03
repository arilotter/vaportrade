import { DetailsSection } from "packard-belle";
import { useDrop } from "react-dnd";
import { useImmer } from "use-immer";
import { DragItemType, Item } from "../../utils/utils";

interface TradeOfferProps {
  title: string;
  children?: React.ReactNode;
  kind: keyof typeof DragItemType;
}
export function TradeOffer({ title, children, kind }: TradeOfferProps) {
  const [items, updateItems] = useImmer<Item[]>([]);
  const [{ isOver }, drop] = useDrop(() => ({
    accept: kind,
    drop: () => {
      console.log("DROPPED!");
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));
  return (
    <div className="tradeOffer" ref={drop}>
      <DetailsSection title={title}>{children}</DetailsSection>
    </div>
  );
}
