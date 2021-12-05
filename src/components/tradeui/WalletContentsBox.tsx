import "./WalletContentsBox.css";
import { Window } from "packard-belle";
import missingIcon from "./missing.png";
import { TokenBalance } from "@0xsequence/indexer";
import { ContractInfo } from "@0xsequence/metadata";
import { useCallback, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import {
  TokenKey,
  ContractKey,
  unique,
  getContractKey,
  getTokenKey,
  chunk,
  normalizeAddress,
  Item,
  useOnEscapePressed,
} from "../../utils/utils";
import { BigNumber, FixedNumber } from "ethers";
import { sequence } from "0xsequence";
import { ChainId } from "@0xsequence/network";
import { Folder } from "./Folder";
import { DraggableIcon } from "./DraggableIcon";
interface WalletContentsBoxProps {
  accountAddress: string;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  onItemSelected: (item: Item) => void;
}

const TOKEN_METADATA_MAX_AT_ONCE = 50;
const chainId = ChainId.POLYGON;

interface Collectible {
  contractAddress: string;
  tokenId: string;
  image: string;
  balance: FixedNumber;
  decimals: number;
  name: string;
  description: string;
  properties: any;
}

export function WalletContentsBox({
  accountAddress,
  indexer,
  metadata,
  onItemSelected,
}: WalletContentsBoxProps) {
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [collectibles, updateCollectibles] = useImmer<
    Map<TokenKey, Collectible | "fetching">
  >(new Map());

  const [contracts, updateContracts] = useImmer<
    Map<ContractKey, ContractInfo | "fetching">
  >(new Map());

  const [tokenFolderAddress, setTokenFolderAddress] = useState<string | null>(
    null
  );

  useOnEscapePressed(useCallback(() => setTokenFolderAddress(null), []));

  // Get all balances for user's address
  useEffect(() => {
    fetchBalances(indexer, accountAddress)
      .then(setBalances)
      .catch((err) => setError(`${err}`));
  }, [indexer, accountAddress]);

  // Get all contracts for user's balances
  useEffect(() => {
    const ctr = fetchContractsForBalances(metadata, balances, contracts);
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
      .catch((err) => setError(`${err}`));

    updateContracts((contracts) => {
      for (const contractAddress of ctr.batchContractAddresses) {
        const key = getContractKey(chainId, contractAddress);
        if (!contracts.has(key)) {
          contracts.set(key, "fetching");
        }
      }
    });
  }, [balances, metadata, contracts, updateContracts]);

  // Get all collectible balances for user's contracts.
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
        fetchCollectibles(metadata, contract, tokens)
          .then((fetched) =>
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
          )
          .catch((err) => setError(`${err}`));
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

  const erc20And721 = [
    ...getItems(
      balances.filter((b) => b.contractType !== "ERC1155"),
      contracts,
      collectibles
    ),
  ];
  const erc1155Folders = getItems(
    balances.reduce<TokenBalance[]>((acc, bal) => {
      // Only load one tokenID of each 1155
      if (
        bal.contractType === "ERC1155" &&
        !acc.some((item) => item.contractAddress === bal.contractAddress)
      ) {
        acc.push(bal);
      }
      return acc;
    }, []),
    contracts
  );

  const tokenFolderContract = tokenFolderAddress
    ? contracts.get(getContractKey(chainId, tokenFolderAddress))
    : undefined;
  const erc155sInOpenFolder = tokenFolderAddress
    ? getItems(
        balances.filter((bal) => bal.contractAddress === tokenFolderAddress),
        contracts,
        collectibles
      )
    : null;

  return (
    <div className="itemBoxContainer">
      {error ? <div className="error">{error}</div> : null}
      <div className="itemBox">
        {erc1155Folders
          .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
          .map(({ name, address, iconUrl }) => (
            <Folder
              key={getContractKey(chainId, address)}
              name={name}
              address={address}
              iconUrl={iconUrl.length ? iconUrl : missingIcon}
              onFolderOpen={() => setTokenFolderAddress(address)}
            />
          ))}
        {erc20And721
          // sort assets with icons first :)
          // really should sort by price tho
          .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
          .map((item) => (
            <DraggableIcon
              item={item}
              key={getTokenKey(ChainId.POLYGON, item.address, item.tokenId)}
              onDoubleClick={() => onItemSelected(item)}
            />
          ))}
      </div>
      {erc155sInOpenFolder?.length &&
      typeof tokenFolderContract === "object" ? (
        <Window
          icon={tokenFolderContract.logoURI}
          title={`${tokenFolderContract.name} (${tokenFolderContract.address})`}
          className="tokenFolder"
          onClose={() => setTokenFolderAddress(null)}
        >
          <div className="itemBox">
            {erc155sInOpenFolder
              .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
              .map((item) => (
                <DraggableIcon
                  item={item}
                  key={getTokenKey(ChainId.POLYGON, item.address, item.tokenId)}
                  onDoubleClick={() => onItemSelected(item)}
                />
              ))}
          </div>
        </Window>
      ) : null}
    </div>
  );
}

function fetchContractsForBalances(
  metadata: sequence.metadata.Metadata,
  balances: TokenBalance[],
  contracts: Map<ContractKey, ContractInfo | "fetching">
): null | {
  batchPromise: Promise<sequence.metadata.GetContractInfoBatchReturn>;
  batchContractAddresses: string[];
} {
  const contractAddresses = unique(balances.map((t) => t.contractAddress));
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

async function fetchBalances(
  indexer: sequence.indexer.Indexer,
  accountAddress: string
): Promise<Array<TokenBalance>> {
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
  return [...balances, ...extraBalances.flat()];
}

function getItems(
  balances: TokenBalance[],
  contracts: Map<ContractKey, ContractInfo | "fetching">,
  collectibles?: Map<TokenKey, Collectible | "fetching">
): Item[] {
  return balances
    .map<Item | null>((balance) => {
      const collectible = collectibles?.get(
        getTokenKey(chainId, balance.contractAddress, balance.tokenID)
      );
      if (typeof collectible === "object") {
        return {
          address: collectible.contractAddress,
          iconUrl: collectible.image,
          name: collectible.name,
          balance: collectible.balance.divUnsafe(
            FixedNumber.from(BigNumber.from(10).pow(collectible.decimals))
          ),
          tokenId: collectible.tokenId,
        };
      }
      const key = getContractKey(chainId, balance.contractAddress);
      const contract = contracts.get(key);
      return typeof contract === "object"
        ? {
            address: balance.contractAddress,
            balance: FixedNumber.from(balance.balance).divUnsafe(
              FixedNumber.from(BigNumber.from(10).pow(contract.decimals ?? 0))
            ),
            iconUrl: contract.logoURI,
            name: contract.name,
            tokenId: balance.tokenID,
          }
        : null;
    })
    .filter((i): i is Item => i !== null);
}
async function fetchCollectibles(
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
      tokenId: token.tokenID,
      properties: tokenMetadata?.properties,
    };
  });
}
