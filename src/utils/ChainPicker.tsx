import { FormSelect } from "../FormSelect";
import { chainConfigs, SupportedChain, supportedChains } from "./multichain";

import "./ChainPicker.css";
import { config } from "../settings";

interface ChainPickerProps {
  chain: SupportedChain;
  setChain: (chain: SupportedChain) => void;
  isDisabled?: boolean;
}

const options = supportedChains
  .filter(
    (id) =>
      config.testnetModeSetMeToTheStringTrue === "true" ||
      !chainConfigs[id].testnet
  )
  .map((chainID) => ({
    value: chainID,
    label: chainConfigs[chainID].title,
    icon: chainConfigs[chainID].iconUrl,
  }));

export function ChainPicker({ chain, setChain, isDisabled }: ChainPickerProps) {
  return (
    <>
      <FormSelect
        className="chainPicker"
        value={options.find((opt) => opt.value === chain)!}
        onChange={(val) => {
          if (val) {
            setChain(val.value);
          }
        }}
        options={options}
        isDisabled={isDisabled}
      />
    </>
  );
}
