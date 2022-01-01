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
            0xBF03137B38e6051C497f5C071d2D1DBd08bE181A{" "}
            <ButtonForm
              onClick={() =>
                navigator.clipboard.writeText(
                  "0xBF03137B38e6051C497f5C071d2D1DBd08bE181A"
                )
              }
            >
              Copy
            </ButtonForm>
          </p>
          <img
            src={walletQR}
            width="64"
            alt="0xBF03137B38e6051C497f5C071d2D1DBd08bE181A"
          />
        </div>
      </Window>
    </div>
  );
}
