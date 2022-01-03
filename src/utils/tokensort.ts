import { ContractType, Item } from "./utils";
import { verifiedContracts } from "./verified";

export function itemSort(a: Item<ContractType>, b: Item<ContractType>): number {
  return (
    (+verifiedContracts[b.chainID].has(b.contractAddress) -
      +verifiedContracts[a.chainID].has(a.contractAddress)) *
      2 +
    (+Boolean(b.iconUrl) - +Boolean(a.iconUrl))
  );
}
