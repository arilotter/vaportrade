import { ButtonProgram } from "packard-belle";
import { makeBlockyIcon } from "./makeBlockyIcon";

interface TradeRequestPopupProps {
  address: string;
  isActive: boolean;
  onClick: () => void;
  flash: boolean;
}

export function TradeRequestPopup({
  address,
  isActive,
  onClick,
  flash,
}: TradeRequestPopupProps) {
  return (
    <ButtonProgram
      icon={makeBlockyIcon(address)}
      isActive={isActive}
      onClick={onClick}
      className={flash ? "flashingTradeRequest" : ""}
    >
      {address}
    </ButtonProgram>
  );
}
