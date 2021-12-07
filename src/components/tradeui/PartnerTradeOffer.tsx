import { sequence } from "0xsequence";
import { ContractInfo } from "@0xsequence/metadata";
import { ChainId } from "@0xsequence/network";
import { BigNumber } from "@ethersproject/bignumber";
import { useEffect } from "react";
import { useImmer } from "use-immer";
import {
  ContractKey,
  ContractType,
  getContractKey,
  getTokenKey,
  isKnownContractType,
  Item,
  NetworkItem,
  TokenKey,
} from "../../utils/utils";
import {
  Collectible,
  fetchCollectibles,
  fetchContractsForBalances,
} from "./contracts";
import { TradeOffer } from "./TradeOffer";

const chainId = ChainId.POLYGON;

interface PartnerTradeOfferProps {
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  items: readonly NetworkItem[];
}
export function PartnerTradeOffer({
  indexer,
  metadata,
  items,
}: PartnerTradeOfferProps) {
  const [contracts, updateContracts] = useImmer<
    Map<ContractKey, ContractInfo | "fetching">
  >(new Map());

  // TODO deduplicate this code between here & WalletContentsBox
  const [collectibles, updateCollectibles] = useImmer<
    Map<TokenKey, Collectible | "fetching">
  >(new Map());

  // Get collectibles.

  // Get all contracts for user's balances
  useEffect(() => {
    const ctr = fetchContractsForBalances(
      chainId,
      metadata,
      items.map((item) => item.address),
      contracts
    );
    if (!ctr) {
      return;
    }

    ctr.batchPromise.then(({ contractInfoMap }) => {
      updateContracts((contracts) => {
        for (const contractAddress of ctr.batchContractAddresses) {
          const key = getContractKey(chainId, contractAddress);
          contracts.set(key, contractInfoMap[contractAddress.toLowerCase()]);
        }
      });
    });

    updateContracts((contracts) => {
      for (const contractAddress of ctr.batchContractAddresses) {
        const key = getContractKey(chainId, contractAddress);
        if (!contracts.has(key)) {
          contracts.set(key, "fetching");
        }
      }
    });
  }, [items, metadata, contracts, updateContracts]);

  // Get all collectible balances for user's contracts.
  useEffect(() => {
    async function getMeta() {
      const tokenContracts = [...contracts.values()]
        .filter((c): c is ContractInfo => typeof c === "object")
        .filter((c) => c.type === "ERC1155");
      const myUnfetchedTokens = items.filter(
        (token) =>
          !collectibles.has(getTokenKey(chainId, token.address, token.tokenID))
      );

      for (const contract of tokenContracts) {
        const tokens = myUnfetchedTokens.filter(
          (t) => t.address === contract.address
        );
        fetchCollectibles(chainId, metadata, contract, tokens).then((fetched) =>
          updateCollectibles((collectibles) => {
            for (const item of fetched) {
              const key = getTokenKey(
                chainId,
                item.contractAddress,
                item.tokenID
              );
              collectibles.set(key, item);
            }
          })
        );
      }

      updateCollectibles((collectibles) => {
        for (const balance of myUnfetchedTokens) {
          if (!tokenContracts.some((c) => c.address === balance.address)) {
            continue;
          }
          const key = getTokenKey(chainId, balance.address, balance.tokenID);
          if (!collectibles.has(key)) {
            collectibles.set(key, "fetching");
          }
        }
      });
    }
    getMeta();
  }, [indexer, metadata, contracts, collectibles, updateCollectibles, items]);

  const loadedItems = items
    .map<Item | null>((networkItem) => {
      const contract = contracts.get(
        getContractKey(ChainId.POLYGON, networkItem.address)
      );
      if (typeof contract !== "object") {
        return null;
      }

      const type: ContractType = isKnownContractType(contract.type)
        ? contract.type
        : { other: contract.type };

      const item: Item = {
        type,
        address: networkItem.address,
        balance: BigNumber.from(networkItem.balance),
        originalBalance: BigNumber.from(networkItem.balance),
        iconUrl: contract.logoURI,
        name: contract.name,
        tokenID: networkItem.tokenID,
        decimals: contract.decimals || 1,
      };
      return item;
    })
    .filter((item): item is Item => item !== null);
  return <TradeOffer items={loadedItems} onItemSelected={() => {}} />;
}
