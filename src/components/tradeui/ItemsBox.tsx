import "./ItemsBox.css";
import { ExplorerIcon } from "packard-belle";
import missingIcon from "./missing.png";
import { TokenBalance } from "@0xsequence/indexer";
import { ContractInfo } from "@0xsequence/metadata";
import { useEffect, useState } from "react";
import { useImmer } from "use-immer";
import {
  TokenKey,
  ContractKey,
  unique,
  getContractKey,
  getTokenKey,
  chunk,
  normalizeAddress,
} from "../../utils/utils";
import { ethers } from "ethers";
import { sequence } from "0xsequence";
import { ChainId } from "@0xsequence/network";
interface ItemsBoxProps {
  accountAddress: string;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
}

interface Item {
  address: string;
  name: string;
  balance: string;
  tokenId: string;
  iconUrl: string;
}

const TOKEN_METADATA_MAX_AT_ONCE = 50;
const chainId = ChainId.POLYGON;

interface Collectible {
  contractAddress: string;
  tokenId: string;
  image: string;
  balance: ethers.BigNumber;
  decimals: number;
  name: string;
  description: string;
  properties: any;
}

export function ItemsBox({ accountAddress, indexer, metadata }: ItemsBoxProps) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [collectibles, updateCollectibles] = useImmer<
    Map<TokenKey, Collectible | "fetching">
  >(new Map());

  const [contracts, updateContracts] = useImmer<
    Map<ContractKey, ContractInfo | "fetching">
  >(new Map());

  useEffect(() => {
    async function getBalances() {
      const { balances } = await indexer.getTokenBalances({
        accountAddress,
      });
      const extraBalances = await Promise.all(
        balances
          .filter((b) => b.contractType === "ERC1155")
          .map((balance) =>
            indexer
              .getTokenBalances({
                accountAddress,
                contractAddress: balance.contractAddress,
              })
              .then((b) => b.balances)
          )
      );
      setBalances([...balances, ...extraBalances.flat()]);
    }
    getBalances();
  }, [indexer, accountAddress]);

  useEffect(() => {
    const contractAddresses = unique(balances.map((t) => t.contractAddress));
    if (!contractAddresses.length) {
      return;
    }

    const batchContractAddresses: string[] = [];
    for (const contractAddress of contractAddresses) {
      const key = getContractKey(chainId, contractAddress);

      if (contractAddress !== "0x0" && !contracts.has(key)) {
        batchContractAddresses.push(contractAddress);
      }
    }

    if (batchContractAddresses.length) {
      const batchPromise = metadata.getContractInfoBatch({
        contractAddresses: batchContractAddresses,
        chainID: String(chainId),
      });
      batchPromise.then(({ contractInfoMap }) => {
        updateContracts((contracts) => {
          for (const contractAddress of batchContractAddresses) {
            const key = getContractKey(chainId, contractAddress);
            contracts.set(key, contractInfoMap[contractAddress.toLowerCase()]);
          }
        });
      });
      updateContracts((contracts) => {
        for (const contractAddress of batchContractAddresses) {
          const key = getContractKey(chainId, contractAddress);
          if (!contracts.has(key)) {
            contracts.set(key, "fetching");
          }
        }
      });
    }
  }, [balances, metadata, contracts, updateContracts]);

  useEffect(() => {
    async function getMeta() {
      const tokenContracts = [...contracts.values()]
        .filter((c): c is ContractInfo => typeof c === "object")
        .filter((c) => c.type === "ERC1155");
      const myUnfetchedTokens = balances.filter(
        (token) =>
          !collectibles.has(
            getTokenKey(chainId, token.contractAddress, token.tokenID)
          )
      );

      for (const contract of tokenContracts) {
        const tokens = myUnfetchedTokens.filter(
          (t) => t.contractAddress === contract.address
        );
        getCollectibles(metadata, contract, tokens).then((fetched) =>
          updateCollectibles((collectibles) => {
            for (const item of fetched) {
              const key = getTokenKey(
                chainId,
                item.contractAddress,
                item.tokenId
              );
              collectibles.set(key, item);
            }
          })
        );
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
    accountAddress,
    metadata,
    contracts,
    balances,
    collectibles,
    updateCollectibles,
  ]);
  return (
    <div className="itemsBox">
      {[...getItems(balances, contracts, collectibles)]
        // sort assets with icons first :)
        // really should sort by price tho
        .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
        .map((item) => (
          <ExplorerIcon
            onDoubleClick={() => {
              console.log("addddddddd thing");
            }}
            alt={`${item.name} (${item.address})`}
            key={getTokenKey(chainId, item.address, item.tokenId)}
            icon={item.iconUrl || missingIcon}
            title={item.name}
          />
        ))}
    </div>
  );
}

function getItems(
  balances: TokenBalance[],
  contracts: Map<ContractKey, ContractInfo | "fetching">,
  collectibles: Map<TokenKey, Collectible | "fetching">
): Item[] {
  return balances
    .map<Item | null>((balance) => {
      const collectible = collectibles.get(
        getTokenKey(chainId, balance.contractAddress, balance.tokenID)
      );
      if (typeof collectible === "object") {
        return {
          address: collectible.contractAddress,
          iconUrl: collectible.image,
          name: collectible.name,
          balance: collectible.balance.toString(),
          tokenId: collectible.tokenId,
        };
      }
      const key = getContractKey(chainId, balance.contractAddress);
      const contract = contracts.get(key);
      return typeof contract === "object"
        ? {
            address: balance.contractAddress,
            balance: balance.balance,
            iconUrl: contract.logoURI,
            name: contract.name,
            tokenId: balance.tokenID,
          }
        : null;
    })
    .filter((i): i is Item => i !== null);
}
async function getCollectibles(
  metadata: sequence.metadata.SequenceMetadataClient,
  contract: ContractInfo,
  tokens: Array<{ tokenID: string; balance: string }>
): Promise<Collectible[]> {
  const meta = await Promise.all(
    chunk(tokens, TOKEN_METADATA_MAX_AT_ONCE).map((slice) =>
      metadata
        .getTokenMetadata({
          chainID: String(chainId),
          contractAddress: normalizeAddress(contract.address),
          tokenIDs: slice.map((t) => t.tokenID),
        })
        .then((meta) => meta.tokenMetadata)
    )
  ).then((chunks) => chunks.flat());
  return tokens.map((token) => {
    const tokenMetadata = meta.find((x) => x && x.tokenId === token.tokenID);
    return {
      contractAddress: contract.address,
      image: tokenMetadata?.image ?? "",
      balance: ethers.BigNumber.from(token.balance),
      decimals: tokenMetadata?.decimals ?? contract.decimals ?? 0,
      chainId: contract.chainId,
      name: tokenMetadata?.name ?? "UNKNOWN",
      description: tokenMetadata?.description ?? "",
      tokenId: token.tokenID,
      properties: tokenMetadata?.properties,
    };
  });
}
