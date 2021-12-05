import { BigNumber, FixedNumber } from "@ethersproject/bignumber";
import { ButtonForm, InputText, WindowAlert } from "packard-belle";
import { useState } from "react";
import { Item, useOnEscapePressed } from "../../utils/utils";
import "./PickAmount.css";
interface PickAmountProps {
  item: Item;
  onClose: () => void;
  onAdd: (amount: FixedNumber) => void;
}
export function PickAmountWindow({ item, onClose }: PickAmountProps) {
  useOnEscapePressed(onClose);

  const [amount, setAmount] = useState("0");
  const [parsedAmount, setParsedAmount] = useState(FixedNumber.from(0));

  const notEnoughMoney = BigNumber.from(
    parsedAmount.mulUnsafe(hugeNum).toString().split(".")[0]
  ).gt(
    BigNumber.from(item.balance.mulUnsafe(hugeNum).toString().split(".")[0])
  );
  return (
    <div
      className="modal"
      style={{
        zIndex: 2,
      }}
    >
      <WindowAlert
        title={`Add ${item.name} to the trade?`}
        className="pickAmount"
        onClose={onClose}
      >
        <div>
          <div className="pickAmountInput">
            <img
              src={item.iconUrl}
              alt={item.name}
              width="128"
              style={{
                padding: "8px",
              }}
            />
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
                  const numString = num.toString();
                  console.log(c, numString, numString === c);
                  setAmount(c);
                  setParsedAmount(num);
                } catch {
                  // lulw
                }
              }}
            />
            / {item.balance.toString()}
          </div>
          <div className="error">
            {notEnoughMoney ? `not enough ${item.name}` : ""}
          </div>
          <div className="pickAmountButtons">
            <ButtonForm
              isDisabled={parsedAmount.isZero() || notEnoughMoney}
              onClick={() => {}}
            >
              Add
            </ButtonForm>
            <ButtonForm onClick={onClose}>Cancel</ButtonForm>
          </div>
        </div>
      </WindowAlert>
    </div>
  );
}

const hugeNum = FixedNumber.from("10000000000000");
