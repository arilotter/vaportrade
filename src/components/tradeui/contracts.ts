import { sequence } from "0xsequence";
import { TokenBalance } from "@0xsequence/indexer";
import { ContractInfo } from "@0xsequence/metadata";
import { ChainId } from "@0xsequence/network";
import { BigNumber } from "ethers";
import {
  ContractKey,
  unique,
  getContractKey,
  chunk,
  normalizeAddress,
  ContractType,
  Item,
  isKnownContractType,
  TokenKey,
  NetworkItem,
  getTokenKey,
  KnownContractType,
} from "../../utils/utils";

export function fetchContractsForBalances(
  chainId: ChainId,
  metadata: sequence.metadata.Metadata,
  addresses: string[],
  contracts: Map<ContractKey, ContractInfo | "fetching">
): null | {
  batchPromise: Promise<sequence.metadata.GetContractInfoBatchReturn>;
  batchContractAddresses: string[];
} {
  const contractAddresses = unique(addresses);
  if (!contractAddresses.length) {
    return null;
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
    return { batchPromise, batchContractAddresses };
  }
  return null;
}

export interface Collectible {
  chainID: ChainId;
  contractAddress: string;
  tokenID: string;
  image: string;
  decimals: number;
  name: string;
  description: string;
  properties: any;
}

const TOKEN_METADATA_MAX_AT_ONCE = 50;
export async function fetchCollectibles(
  chainId: ChainId,
  metadata: sequence.metadata.SequenceMetadataClient,
  contract: ContractInfo,
  tokenIDs: string[]
): Promise<Collectible[]> {
  const meta = await Promise.all(
    chunk(tokenIDs, TOKEN_METADATA_MAX_AT_ONCE).map((slice) =>
      metadata
        .getTokenMetadata({
          chainID: String(chainId),
          contractAddress: normalizeAddress(contract.address),
          tokenIDs: slice,
        })
        .then((meta) => meta.tokenMetadata)
    )
  ).then((chunks) => chunks.flat());
  return tokenIDs.map((tokenID) => {
    const tokenMetadata = meta.find((x) => x && x.tokenId === tokenID);
    const collectible: Collectible = {
      chainID: contract.chainId,
      contractAddress: contract.address,
      image: tokenMetadata?.image ?? "",
      decimals: tokenMetadata?.decimals ?? contract.decimals ?? 0,
      name: tokenMetadata?.name ?? "UNKNOWN",
      description: tokenMetadata?.description ?? "",
      tokenID: tokenID,
      properties: tokenMetadata?.properties,
    };
    return collectible;
  });
}

export async function fetchBalances(
  indexer: sequence.indexer.Indexer,
  accountAddress: string
): Promise<Array<TokenBalance>> {
  const { balances } = await indexer.getTokenBalances({
    accountAddress,
  });
  const extraBalances = await Promise.all(
    balances
      .filter(
        (b) => b.contractType === "ERC1155" || b.contractType === "ERC721"
      )
      .map((balance) =>
        indexer
          .getTokenBalances({
            accountAddress,
            contractAddress: balance.contractAddress,
          })
          .then((b) => b.balances)
      )
  );
  return [
    ...balances.filter(
      (b) => b.contractType !== "ERC1155" && b.contractType !== "ERC721"
    ),
    ...extraBalances.flat(),
  ];
}

export function getItems({
  balances,
  contracts,
  collectibles,
  typeFilter,
  subtractItems,
}: {
  balances: TokenBalance[] | NetworkItem[];
  contracts: Map<ContractKey, ContractInfo | "fetching">;
  collectibles: Map<TokenKey, Collectible | "fetching"> | undefined;
  typeFilter?: Array<KnownContractType | "other">;
  subtractItems?: readonly Item<ContractType>[] | readonly NetworkItem[];
}): Item<ContractType>[] {
  return balances
    .map<Item<ContractType> | null>((balance) => {
      const chainID = "chainId" in balance ? balance.chainId : balance.chainID;
      const key = getContractKey(chainID, balance.contractAddress);
      const contract = contracts.get(key);
      if (typeof contract !== "object") {
        return null;
      }
      const t =
        contract.type ||
        // TODO is it safe to accept an asset type from another user?
        // Why doesn't sequence know the contract type?
        ("contractType" in balance ? balance.contractType : balance.type);
      const type: ContractType =
        // hack to mark matic a native token type
        contract.address === "0x0000000000000000000000000000000000001010" ||
        balance.contractAddress === "0x0000000000000000000000000000000000001010"
          ? { other: "native" }
          : isKnownContractType(t)
          ? t
          : { other: t };
      if (
        typeFilter &&
        !typeFilter.includes(typeof type === "object" ? "other" : type)
      ) {
        return null;
      }
      const collectible = collectibles?.get(
        getTokenKey(chainID, balance.contractAddress, balance.tokenID)
      );
      if (typeof collectible === "object") {
        const item: Item<ContractType> = {
          type,
          chainID,
          contractAddress: collectible.contractAddress,
          iconUrl: collectible.image,
          name: collectible.name,
          balance: BigNumber.from(balance.balance),
          tokenID: collectible.tokenID,
          originalBalance: BigNumber.from(balance.balance),
          decimals: collectible.decimals,
        };
        return item;
      }
      if (typeof contract === "object") {
        const item: Item<ContractType> = {
          type,
          chainID,
          contractAddress: balance.contractAddress,
          balance: BigNumber.from(balance.balance),
          iconUrl: contract.logoURI,
          name: contract.name,
          tokenID: balance.tokenID,
          originalBalance: BigNumber.from(balance.balance),
          decimals: contract.decimals || 1,
        };
        return item;
      } else {
        return null;
      }
    })
    .filter((i): i is Item<ContractType> => i !== null)
    .map((item) => {
      if (!subtractItems) {
        return item;
      }
      const associatedSubtractItem = [...subtractItems].find(
        (i) =>
          i.contractAddress === item.contractAddress &&
          i.tokenID === item.tokenID
      );
      if (associatedSubtractItem) {
        return {
          ...item,
          balance: item.balance.sub(
            typeof associatedSubtractItem.balance === "string"
              ? BigNumber.from(associatedSubtractItem.balance)
              : associatedSubtractItem.balance
          ),
        };
      }
      return item;
    });
}

export type CollectiblesDB = Map<TokenKey, Collectible | "fetching">;
export type ContractsDB = Map<ContractKey, ContractInfo | "fetching">;
export interface FetchableToken {
  chainID: ChainId;
  contractAddress: string;
  tokenID: string;
}
