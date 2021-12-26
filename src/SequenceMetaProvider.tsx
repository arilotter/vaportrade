import { sequence } from "0xsequence";
import { ContractInfo } from "@0xsequence/metadata";
import { useCallback, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import {
  FetchableToken,
  CollectiblesDB,
  ContractsDB,
  fetchContractsForBalances,
  fetchCollectibles,
} from "./components/tradeui/contracts";
import { chainId } from "./settings";
import { getContractKey, getTokenKey } from "./utils/utils";

interface SequenceMetaProviderProps {
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  children: (props: SequenceMetaProps) => JSX.Element;
}

interface SequenceMetaProps {
  collectibles: CollectiblesDB;
  contracts: ContractsDB;
  requestTokensFetch: (tokens: FetchableToken[]) => void;
  hardError: string | null;
}

export function SequenceMetaProvider({
  indexer,
  metadata,
  children,
}: SequenceMetaProviderProps) {
  const [hardError, setHardError] = useState<string | null>(null);
  // Metadata about assets
  const [tokensToFetch, updateTokensToFetch] = useImmer<FetchableToken[]>([]);
  const [collectibles, updateCollectibles] = useImmer<CollectiblesDB>(
    new Map()
  );
  const [contracts, updateContracts] = useImmer<ContractsDB>(new Map());

  const requestTokensFetch = useCallback(
    (tokens: FetchableToken[]) => {
      updateTokensToFetch((balances) => {
        const newTokens = tokens.filter(
          (tok) =>
            !balances.some(
              (b) =>
                b.contractAddress === tok.contractAddress &&
                b.tokenID === tok.tokenID
            )
        );
        balances.push(...newTokens);
      });
    },
    [updateTokensToFetch]
  );

  // Get all contracts for user's balances
  useEffect(() => {
    if (!metadata) {
      return;
    }
    const ctr = fetchContractsForBalances(
      chainId,
      metadata,
      tokensToFetch.map((t) => t.contractAddress),
      contracts
    );
    if (!ctr) {
      return;
    }

    ctr.batchPromise
      .then(({ contractInfoMap }) => {
        updateContracts((contracts) => {
          for (const contractAddress of ctr.batchContractAddresses) {
            const key = getContractKey(chainId, contractAddress);
            contracts.set(key, contractInfoMap[contractAddress.toLowerCase()]);
          }
        });
      })
      .catch((err) =>
        err instanceof Error
          ? setHardError(`${err.name}\n${err.message}\n${err.stack}`)
          : setHardError(JSON.stringify(err, undefined, 2))
      );

    updateContracts((contracts) => {
      for (const contractAddress of ctr.batchContractAddresses) {
        const key = getContractKey(chainId, contractAddress);
        if (!contracts.has(key)) {
          contracts.set(key, "fetching");
        }
      }
    });
  }, [tokensToFetch, metadata, contracts, updateContracts]);

  // Get all collectible balances for user's contracts.
  useEffect(() => {
    async function getMeta() {
      const tokenContracts = [...contracts.values()]
        .filter((c): c is ContractInfo => typeof c === "object")
        .filter((c) => c.type === "ERC721" || c.type === "ERC1155");
      const myUnfetchedTokens = tokensToFetch.filter(
        (token) =>
          !collectibles.has(
            getTokenKey(chainId, token.contractAddress, token.tokenID)
          )
      );

      for (const contract of tokenContracts) {
        const tokens = myUnfetchedTokens.filter(
          (t) => t.contractAddress === contract.address
        );
        fetchCollectibles(
          chainId,
          metadata,
          contract,
          tokens.map((token) => token.tokenID)
        )
          .then((fetched) =>
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
          )
          .catch((err) => setHardError(`${err}`));
      }

      updateCollectibles((collectibles) => {
        for (const balance of myUnfetchedTokens) {
          if (
            !tokenContracts.some((c) => c.address === balance.contractAddress)
          ) {
            continue;
          }
          const key = getTokenKey(
            chainId,
            balance.contractAddress,
            balance.tokenID
          );
          if (!collectibles.has(key)) {
            collectibles.set(key, "fetching");
          }
        }
      });
    }
    getMeta();
  }, [
    indexer,
    metadata,
    tokensToFetch,
    contracts,
    collectibles,
    updateCollectibles,
  ]);
  return children({
    collectibles,
    contracts,
    requestTokensFetch,
    hardError,
  });
}
