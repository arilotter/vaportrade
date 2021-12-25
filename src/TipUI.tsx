import { ButtonForm, Window } from "packard-belle";
import tipIcon from "./icons/tip.png";
import { useOnKeyDown } from "./utils/utils";

import walletQR from "./icons/walletqr.png";

interface TipUIProps {
  onClose: () => void;
  onMinimize: () => void;
}
export function TipUI({ onClose, onMinimize }: TipUIProps) {
  useOnKeyDown("Escape", onClose);
  return (
    <div className="modal">
      <Window
        title="Donate"
        icon={tipIcon}
        onClose={onClose}
        onMinimize={onMinimize}
        resizable={false}
      >
        <div
          style={{
            lineHeight: "2em",
            textAlign: "center",
            maxWidth: "256px",
            padding: "16px",
          }}
        >
          <p>Thanks for using vaportrade.net!</p>
          <p>
            If you want to support me, you can send me some crypto on the
            Ethereum or Polygon networks at this address:
          </p>
          <p>
            0x831dE831A64405aF965C67d6E0De2F9876fa2d99{" "}
            <ButtonForm
              onClick={() =>
                navigator.clipboard.writeText(
                  "0x831dE831A64405aF965C67d6E0De2F9876fa2d99"
                )
              }
            >
              Copy
            </ButtonForm>
          </p>
          <img
            src={walletQR}
            width="64"
            alt="0x831dE831A64405aF965C67d6E0De2F9876fa2d99"
          />
        </div>
      </Window>
    </div>
  );
}
