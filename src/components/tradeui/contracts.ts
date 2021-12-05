import { sequence } from "0xsequence";
import { ContractInfo } from "@0xsequence/metadata";
import { ChainId } from "@0xsequence/network";
import { FixedNumber } from "ethers";
import {
  ContractKey,
  unique,
  getContractKey,
  chunk,
  normalizeAddress,
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
  contractAddress: string;
  tokenID: string;
  image: string;
  balance: FixedNumber;
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
      balance: FixedNumber.from(token.balance),
      decimals: tokenMetadata?.decimals ?? contract.decimals ?? 0,
      chainId: contract.chainId,
      name: tokenMetadata?.name ?? "UNKNOWN",
      description: tokenMetadata?.description ?? "",
      tokenID: token.tokenID,
      properties: tokenMetadata?.properties,
    };
  });
}
