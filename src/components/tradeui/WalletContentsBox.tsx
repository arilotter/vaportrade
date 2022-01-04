import "./WalletContentsBox.css";
import { Window } from "packard-belle";
import missingIcon from "./missing.png";
import { TokenBalance } from "@0xsequence/indexer";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  getContractKey,
  getTokenKey,
  Item,
  useOnKeyDown,
  NetworkItem,
  KnownContractType,
  isKnownContractType,
  DragItemType,
  normalizeAddress,
} from "../../utils/utils";
import { Folder } from "./Folder";
import { DraggableIcon } from "./DraggableIcon";
import { getItems } from "./contracts";
import { useDrop } from "react-dnd";
import { SupportedChain } from "../../utils/multichain";
import { itemSort } from "../../utils/tokensort";
import { IndexerContext } from "../../SequenceMetaProvider";
interface WalletContentsBoxProps {
  accountAddress: string;
  chainID: SupportedChain;
  onItemSelected?: (item: Item<KnownContractType>) => void;
  onItemDropped?: (item: Item<KnownContractType>) => void;
  subtractItems?:
    | ReadonlyArray<Item<KnownContractType>>
    | readonly NetworkItem[];
  className?: string;
  mine: boolean;
  isInTrade: boolean;
  reloadNonce: number;
}

export function WalletContentsBox({
  accountAddress,
  chainID,
  onItemSelected,
  subtractItems,
  className,
  mine,
  onItemDropped,
  isInTrade,
  reloadNonce,
}: WalletContentsBoxProps) {
  const [{ canDrop, isHovering }, drop] = useDrop(
    () => ({
      accept: mine
        ? DragItemType.MY_ITEM_IN_TRADE
        : DragItemType.THEIR_ITEM_IN_TRADE,
      drop: onItemDropped,
      collect: (monitor) => ({
        canDrop: !!monitor.canDrop(),
        isHovering: !!monitor.isOver() && !!monitor.canDrop(),
      }),
    }),
    [mine, onItemDropped]
  );

  const {
    fetchBalances,
    requestTokenMetadataFetch,
    contracts,
    collectibles,
  } = useContext(IndexerContext);

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
    console.log("fetching bALANCE");
    setBalances([]);
    fetchBalances(chainID, accountAddress)
      .then(setBalances)
      .catch((err) => setError(`${err}`));
  }, [fetchBalances, chainID, accountAddress, reloadNonce]);

  // Request contract metadata fetch for all balances
  useEffect(() => {
    requestTokenMetadataFetch(
      balances
        .filter((bal) => isKnownContractType(bal.contractType))
        .map((bal) => ({
          chainID,
          accountAddress: bal.accountAddress,
          contractAddress: bal.contractAddress,
          contractType: bal.contractType as KnownContractType,
          tokenID: bal.tokenID,
        }))
    );
  }, [balances, requestTokenMetadataFetch, chainID]);

  const erc20 = [
    ...getItems({
      balances,
      contracts,
      collectibles,
      subtractItems,
      typeFilter: ["ERC20"],
    }),
  ] as Array<Item<KnownContractType>>; // ok to assert type because we filter above

  const otherTokens = [
    ...getItems({
      balances,
      contracts,
      collectibles,
      subtractItems,
      typeFilter: ["other"],
    }),
  ];

  const nftFolders = getItems({
    balances: balances.reduce<TokenBalance[]>((acc, bal) => {
      // Only load one tokenID of each nft
      if (!acc.some((item) => item.contractAddress === bal.contractAddress)) {
        acc.push(bal);
      }
      return acc;
    }, []),
    typeFilter: ["ERC721", "ERC1155"],
    contracts,
    collectibles: undefined,
    subtractItems,
  });

  const tokenFolderContract = tokenFolderAddress
    ? contracts.get(getContractKey(chainID, tokenFolderAddress))
    : undefined;
  const nftsInOpenFolder = tokenFolderAddress
    ? (getItems({
        balances: balances.filter(
          (bal) =>
            normalizeAddress(bal.contractAddress) ===
            normalizeAddress(tokenFolderAddress)
        ),
        contracts,
        collectibles,
        subtractItems,
      }) as Array<Item<KnownContractType>>) // ok to assert type because we filter above
    : null;

  return (
    <>
      <div
        className={`itemBoxContainer ${className}`}
        onContextMenu={(ev) => ev.preventDefault()}
      >
        {error ? <div className="error">{error}</div> : null}
        <div
          className={`itemBox ${canDrop ? "canDrop" : ""} ${
            isHovering ? "isHovering" : ""
          }`}
          ref={drop}
        >
          {nftFolders
            .sort(itemSort)
            .map(({ name, contractAddress, iconUrl, type }) => (
              <Folder
                key={getContractKey(chainID, contractAddress)}
                name={name}
                chainID={chainID}
                contractAddress={contractAddress}
                iconUrl={iconUrl.length ? iconUrl : missingIcon}
                onFolderOpen={() => setTokenFolderAddress(contractAddress)}
                type={type as "ERC721" | "ERC1155"}
              />
            ))}
          {erc20.sort(itemSort).map((item) => (
            <DraggableIcon
              item={item}
              key={getTokenKey(chainID, item.contractAddress, item.tokenID)}
              onDoubleClick={() => {
                if (onItemSelected) {
                  onItemSelected(item);
                }
              }}
              dragItemType={
                mine
                  ? DragItemType.MY_ITEM_IN_WALLET
                  : DragItemType.THEIR_ITEM_IN_WALLET
              }
              menuOptions={
                isInTrade && onItemSelected
                  ? [
                      {
                        title: subtractItems?.some(
                          (i) =>
                            i.contractAddress === item.contractAddress &&
                            i.tokenID === item.tokenID
                        )
                          ? "Change Amount..."
                          : "Add to Trade...",
                        onClick: () => onItemSelected(item),
                      },
                    ]
                  : []
              }
            />
          ))}
          {otherTokens.sort(itemSort).map((item) => (
            <DraggableIcon
              isDisabled
              item={item}
              key={getTokenKey(chainID, item.contractAddress, item.tokenID)}
              onDoubleClick={() => {}}
              dragItemType={
                mine
                  ? DragItemType.MY_ITEM_IN_WALLET
                  : DragItemType.THEIR_ITEM_IN_WALLET
              }
            />
          ))}
        </div>
      </div>
      {nftsInOpenFolder?.length && typeof tokenFolderContract === "object" ? (
        <Window
          icon={tokenFolderContract.logoURI}
          title={`${tokenFolderContract.name} (${tokenFolderContract.address})`}
          className="tokenFolder"
          onClose={() => setTokenFolderAddress(null)}
        >
          <div className="itemBox" onContextMenu={(ev) => ev.preventDefault()}>
            {nftsInOpenFolder.sort(itemSort).map((item) => (
              <DraggableIcon
                item={item}
                key={getTokenKey(chainID, item.contractAddress, item.tokenID)}
                onDoubleClick={() => {
                  if (onItemSelected) {
                    onItemSelected(item);
                  }
                }}
                dragItemType={
                  mine
                    ? DragItemType.MY_ITEM_IN_WALLET
                    : DragItemType.THEIR_ITEM_IN_WALLET
                }
                menuOptions={
                  isInTrade && onItemSelected
                    ? [
                        {
                          title: subtractItems?.some(
                            (i) =>
                              i.contractAddress === item.contractAddress &&
                              i.tokenID === item.tokenID
                          )
                            ? item.type === "ERC721"
                              ? "Remove from Trade"
                              : "Change Amount..."
                            : item.type === "ERC721"
                            ? "Add to Trade"
                            : "Add to Trade...",
                          onClick: () => onItemSelected(item),
                        },
                      ]
                    : []
                }
              />
            ))}
          </div>
        </Window>
      ) : null}
    </>
  );
}
