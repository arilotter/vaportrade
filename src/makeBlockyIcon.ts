import * as blockies from "blockies-ts";
import { defaultSize } from "./components/ProfileIcon";
export function makeBlockyIcon(address: string) {
  return blockies
    .create({ seed: address.toUpperCase(), size: defaultSize })
    .toDataURL();
}
