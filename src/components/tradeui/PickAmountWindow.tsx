import { BigNumber, FixedNumber } from "@ethersproject/bignumber";
import { ButtonForm, InputText, WindowAlert } from "packard-belle";
import { useState } from "react";
import { Item, useOnKeyDown } from "../../utils/utils";
import "./PickAmount.css";
interface PickAmountProps {
  item: Item;
  onClose: () => void;
  onAdd: (amount: FixedNumber) => void;
}
export function PickAmountWindow({ item, onClose, onAdd }: PickAmountProps) {
  useOnKeyDown("Escape", onClose);
  const amountInTrade = item.originalBalance.subUnsafe(item.balance);

  const [amount, setAmount] = useState(amountInTrade.toString());
  const [parsedAmount, setParsedAmount] = useState(amountInTrade);

  const notEnoughMoney = BigNumber.from(
    parsedAmount.mulUnsafe(hugeNum).toString().split(".")[0]
  ).gt(
    BigNumber.from(
      item.originalBalance.mulUnsafe(hugeNum).toString().split(".")[0]
    )
  );

  return (
    <div
      className="modal"
      style={{
        zIndex: 2,
      }}
    >
      <WindowAlert
        title={`Offer some ${item.name}?`}
        className="pickAmount"
        onClose={onClose}
      >
        <div>
          <div className="pickAmountContentsContainer">
            <img
              src={item.iconUrl}
              alt={item.name}
              width="128"
              style={{
                padding: "8px",
              }}
            />
            <div className="pickAmountInput">
              {amountInTrade.isZero()
                ? ""
                : `Current Offer:\n${amountInTrade.toString()}`}
              <div>
                <InputText
                  value={amount.toString()}
                  onChange={(c: string) => {
                    let fakeNum = c;
                    try {
                      if (fakeNum.endsWith(".")) {
                        fakeNum += "0";
                      }
                      if (fakeNum.length === 0) {
                        fakeNum = "0";
                      }
                      const num = FixedNumber.from(fakeNum);
                      setAmount(c);
                      setParsedAmount(num);
                    } catch {
                      // lulw
                    }
                  }}
                />
                / {item.originalBalance.toString()}
              </div>
              <div className="pickAmountExtraButtons">
                <ButtonForm
                  onClick={() => {
                    setAmount("0");
                    setParsedAmount(FixedNumber.from(0));
                  }}
                >
                  Zero
                </ButtonForm>
                <ButtonForm
                  onClick={() => {
                    setAmount(item.originalBalance.toString());
                    setParsedAmount(item.originalBalance);
                  }}
                >
                  Maximum
                </ButtonForm>
              </div>
            </div>
          </div>
          <div className="error">
            {notEnoughMoney ? `not enough ${item.name}` : ""}
          </div>
          <div className="pickAmountButtons">
            <ButtonForm
              isDisabled={notEnoughMoney}
              onClick={() => onAdd(parsedAmount)}
            >
              Offer
            </ButtonForm>
            <ButtonForm onClick={onClose}>Cancel</ButtonForm>
          </div>
        </div>
      </WindowAlert>
    </div>
  );
}

const hugeNum = FixedNumber.from("10000000000000");
