import { sequence } from "0xsequence";
import { ContractInfo } from "@0xsequence/metadata";
import { ChainId } from "@0xsequence/network";
import { useCallback, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import {
  FetchableToken,
  CollectiblesDB,
  ContractsDB,
  fetchContractsForBalances,
  fetchCollectibles,
} from "./components/tradeui/contracts";
import { chainConfigs, Indexers, supportedChains } from "./utils/multichain";
import {
  getContractKey,
  getTokenKey,
  getTokenKeyFromToken,
  nativeTokenAddress,
} from "./utils/utils";

interface SequenceMetaProviderProps {
  indexers: Indexers;
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
  indexers,
  metadata,
  children,
}: SequenceMetaProviderProps) {
  const [hardError, setHardError] = useState<string | null>(null);
  // Metadata about assets
  const [tokensToFetch, updateTokensToFetch] = useImmer<FetchableToken[]>([]);
  const [collectibles, updateCollectibles] = useImmer<CollectiblesDB>(
    new Map()
  );
  const [contracts, updateContracts] = useImmer<ContractsDB>(
    new Map(
      supportedChains.map((chainId) => {
        const chainConfig = chainConfigs[chainId];
        return [
          getContractKey(chainId, nativeTokenAddress),
          {
            chainId,
            address: nativeTokenAddress,
            type: "native",
            name: chainConfig.title,
            symbol: chainConfig.nativeTokenSymbol,
            logoURI: chainConfigs[chainId].iconUrl,
            extensions: {
              link: "",
              description: `The native token for ${chainConfigs[chainId].title}.`,
              ogImage: "",
              originChainId: 0,
              originAddress: "",
              blacklist: false,
            },
            decimals: 18, // all EVM native tokens have 18 decimals
          },
        ];
      })
    )
  );

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

  // Get all contracts for any list of tokens
  useEffect(() => {
    if (!metadata) {
      return;
    }
    const addressesByChainID = tokensToFetch.reduce<Map<ChainId, Set<string>>>(
      (map, { chainID, contractAddress }) => {
        if (!map.has(chainID)) {
          map.set(chainID, new Set());
        }
        map.get(chainID)!.add(contractAddress.toLowerCase());
        return map;
      },
      new Map()
    );
    for (const [chainID, addresses] of addressesByChainID.entries()) {
      const addrs = [...addresses];
      const contractFetch = fetchContractsForBalances(
        chainID,
        metadata,
        addrs,
        contracts
      );
      if (!contractFetch) {
        continue;
      }

      contractFetch.batchPromise
        .then(({ contractInfoMap }) => {
          const infoMapAddrs = Object.keys(contractInfoMap);
          updateContracts((contracts) => {
            for (const contractAddress of addrs) {
              const key = getContractKey(chainID, contractAddress);
              if (contracts.has(key) && contracts.get(key) !== "fetching") {
                continue;
              }
              if (
                infoMapAddrs.some(
                  (c) => c.toLowerCase() === contractAddress.toLowerCase()
                )
              ) {
                contracts.set(
                  key,
                  contractInfoMap[contractAddress.toLowerCase()]
                );
              } else {
                // no contract meta found!
                contracts.set(key, {
                  address: contractAddress,
                  chainId: chainID,
                  logoURI: "",
                  name: contractAddress,
                  symbol: "???",
                  type: "???",
                  extensions: {
                    blacklist: false,
                    description: "Unknown Token",
                    link: "",
                    ogImage: "",
                    originAddress: "",
                    originChainId: 0,
                  },
                });
              }
            }
          });
        })
        .catch((err) =>
          err instanceof Error
            ? setHardError(`${err.name}\n${err.message}\n${err.stack}`)
            : setHardError(JSON.stringify(err, undefined, 2))
        );

      updateContracts((contracts) => {
        for (const contractAddress of contractFetch.batchContractAddresses) {
          const key = getContractKey(chainID, contractAddress);
          if (!contracts.has(key)) {
            contracts.set(key, "fetching");
          }
        }
      });
    }
  }, [tokensToFetch, metadata, contracts, updateContracts]);

  // Get all collectible balances for user's contracts.
  useEffect(() => {
    async function getMeta() {
      const tokenContracts = [...contracts.values()]
        .filter((c): c is ContractInfo => typeof c === "object")
        .filter((c) => c.type === "ERC721" || c.type === "ERC1155");
      const myUnfetchedTokens = tokensToFetch.filter(
        (token) => !collectibles.has(getTokenKeyFromToken(token))
      );

      for (const contract of tokenContracts) {
        const tokens = myUnfetchedTokens.filter(
          (t) =>
            t.contractAddress.toLowerCase() ===
              contract.address.toLowerCase() && t.chainID === contract.chainId
        );
        fetchCollectibles(
          contract.chainId,
          metadata,
          contract,
          tokens.map((token) => token.tokenID)
        )
          .then((fetched) =>
            updateCollectibles((collectibles) => {
              for (const item of fetched) {
                const key = getTokenKey(
                  item.chainID,
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
            balance.chainID,
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
    indexers,
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
