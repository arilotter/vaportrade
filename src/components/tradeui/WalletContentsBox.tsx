import "./WalletContentsBox.css";
import { Window } from "packard-belle";
import missingIcon from "./missing.png";
import { TokenBalance } from "@0xsequence/indexer";
import { useCallback, useEffect, useState } from "react";
import {
  getContractKey,
  getTokenKey,
  Item,
  useOnKeyDown,
  NetworkItem,
  KnownContractType,
  isKnownContractType,
} from "../../utils/utils";
import { sequence } from "0xsequence";
import { ChainId } from "@0xsequence/network";
import { Folder } from "./Folder";
import { DraggableIcon } from "./DraggableIcon";
import {
  CollectiblesDB,
  ContractsDB,
  FetchableToken,
  fetchBalances,
  getItems,
} from "./contracts";
interface WalletContentsBoxProps {
  accountAddress: string;
  indexer: sequence.indexer.Indexer;
  collectibles: CollectiblesDB;
  contracts: ContractsDB;
  requestTokensFetch: (tokens: FetchableToken[]) => void;
  onItemSelected: (item: Item<KnownContractType>) => void;
  subtractItems:
    | ReadonlyArray<Item<KnownContractType>>
    | readonly NetworkItem[];
}

const chainId = ChainId.POLYGON;

export function WalletContentsBox({
  accountAddress,
  indexer,
  collectibles,
  contracts,
  requestTokensFetch,
  onItemSelected,
  subtractItems,
}: WalletContentsBoxProps) {
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);

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

  // Request contract metadata fetch for all balances
  useEffect(() => {
    requestTokensFetch(
      balances
        .filter((bal) => isKnownContractType(bal.contractType))
        .map((bal) => ({
          accountAddress: bal.accountAddress,
          contractAddress: bal.contractAddress,
          contractType: bal.contractType as KnownContractType,
          tokenID: bal.tokenID,
        }))
    );
  }, [balances, requestTokensFetch]);

  const erc20And721 = [
    ...getItems(
      balances.filter(
        (b) => b.contractType === "ERC20" || b.contractType === "ERC721"
      ),
      contracts,
      collectibles,
      subtractItems
    ),
  ] as Array<Item<KnownContractType>>; // ok to assert type because we filter above

  const otherTokens = [
    ...getItems(
      balances.filter(
        (b) =>
          b.contractType !== "ERC20" &&
          b.contractType !== "ERC721" &&
          b.contractType !== "ERC1155"
      ),
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
    ? (getItems(
        balances.filter((bal) => bal.contractAddress === tokenFolderAddress),
        contracts,
        collectibles,
        subtractItems
      ) as Array<Item<KnownContractType>>) // ok to assert type because we filter above
    : null;

  return (
    <>
      <div className="itemBoxContainer">
        {error ? <div className="error">{error}</div> : null}
        <div className="itemBox">
          {erc1155Folders
            .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
            .map(({ name, contractAddress: address, iconUrl }) => (
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
                key={getTokenKey(
                  ChainId.POLYGON,
                  item.contractAddress,
                  item.tokenID
                )}
                onDoubleClick={() => onItemSelected(item)}
              />
            ))}
          {otherTokens
            .sort((a, b) => +Boolean(b.iconUrl) - +Boolean(a.iconUrl))
            .map((item) => (
              <DraggableIcon
                isDisabled
                item={item}
                key={getTokenKey(
                  ChainId.POLYGON,
                  item.contractAddress,
                  item.tokenID
                )}
                onDoubleClick={() => {}}
              />
            ))}
        </div>
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
                  key={getTokenKey(
                    ChainId.POLYGON,
                    item.contractAddress,
                    item.tokenID
                  )}
                  onDoubleClick={() => onItemSelected(item)}
                />
              ))}
          </div>
        </Window>
      ) : null}
    </>
  );
}
