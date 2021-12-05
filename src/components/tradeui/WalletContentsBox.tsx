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
  getContractKey,
  getTokenKey,
  Item,
  useOnKeyDown,
  NetworkItem,
} from "../../utils/utils";
import { BigNumber, FixedNumber } from "ethers";
import { sequence } from "0xsequence";
import { ChainId } from "@0xsequence/network";
import { Folder } from "./Folder";
import { DraggableIcon } from "./DraggableIcon";
import {
  Collectible,
  fetchCollectibles,
  fetchContractsForBalances,
} from "./contracts";
interface WalletContentsBoxProps {
  accountAddress: string;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  onItemSelected: (item: Item) => void;
  subtractItems: readonly Item[] | readonly NetworkItem[];
}

const chainId = ChainId.POLYGON;

export function WalletContentsBox({
  accountAddress,
  indexer,
  metadata,
  onItemSelected,
  subtractItems,
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

  useOnKeyDown(
    "Escape",
    useCallback(() => setTokenFolderAddress(null), [])
  );

  // Get all balances for user's address
  useEffect(() => {
    fetchBalances(indexer, accountAddress)
      .then(setBalances)
      .catch((err) => setError(`${err}`));
  }, [indexer, accountAddress]);

  // Get all contracts for user's balances
  useEffect(() => {
    const ctr = fetchContractsForBalances(
      chainId,
      metadata,
      balances.map((b) => b.contractAddress),
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
        fetchCollectibles(chainId, metadata, contract, tokens)
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
      collectibles,
      subtractItems
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
    contracts,
    undefined,
    subtractItems
  );

  const tokenFolderContract = tokenFolderAddress
    ? contracts.get(getContractKey(chainId, tokenFolderAddress))
    : undefined;
  const erc155sInOpenFolder = tokenFolderAddress
    ? getItems(
        balances.filter((bal) => bal.contractAddress === tokenFolderAddress),
        contracts,
        collectibles,
        subtractItems
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
              key={getTokenKey(ChainId.POLYGON, item.address, item.tokenID)}
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
                  key={getTokenKey(ChainId.POLYGON, item.address, item.tokenID)}
                  onDoubleClick={() => onItemSelected(item)}
                />
              ))}
          </div>
        </Window>
      ) : null}
    </div>
  );
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
  collectibles: Map<TokenKey, Collectible | "fetching"> | undefined,
  subtractItems: readonly Item[] | readonly NetworkItem[]
): Item[] {
  return balances
    .map<Item | null>((balance) => {
      const collectible = collectibles?.get(
        getTokenKey(chainId, balance.contractAddress, balance.tokenID)
      );
      if (typeof collectible === "object") {
        const num = collectible.balance.divUnsafe(
          FixedNumber.from(BigNumber.from(10).pow(collectible.decimals))
        );
        return {
          address: collectible.contractAddress,
          iconUrl: collectible.image,
          name: collectible.name,
          balance: num,
          tokenID: collectible.tokenID,
          originalBalance: num,
        };
      }
      const key = getContractKey(chainId, balance.contractAddress);
      const contract = contracts.get(key);
      if (typeof contract === "object") {
        const num = FixedNumber.from(balance.balance).divUnsafe(
          FixedNumber.from(BigNumber.from(10).pow(contract.decimals ?? 0))
        );
        return {
          address: balance.contractAddress,
          balance: num,
          iconUrl: contract.logoURI,
          name: contract.name,
          tokenID: balance.tokenID,
          originalBalance: num,
        };
      } else {
        return null;
      }
    })
    .filter((i): i is Item => i !== null)
    .map((item) => {
      const associatedSubtractItem = [...subtractItems].find(
        (i) => i.address === item.address && i.tokenID === item.tokenID
      );
      if (associatedSubtractItem) {
        return {
          ...item,
          balance: item.balance.subUnsafe(
            typeof associatedSubtractItem.balance === "string"
              ? FixedNumber.from(associatedSubtractItem.balance)
              : associatedSubtractItem.balance
          ),
        };
      }
      return item;
    });
}
