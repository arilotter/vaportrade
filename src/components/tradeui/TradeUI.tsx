import { useCallback, useEffect, useState } from "react";
import { sequence } from "0xsequence";
import "./TradeUI.css";
import P2PT from "p2pt";
import { ButtonForm, Checkbox, DetailsSection } from "packard-belle";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { WalletContentsBox } from "./WalletContentsBox";
import { TradeOffer } from "./TradeOffer";
import {
  buildOrder,
  denetworkifySignedOrder,
  doIGoFirst,
  getContractKey,
  getTokenKey,
  isItemWithKnownContractType,
  Item,
  itemToSwapItem,
  KnownContractType,
  networkifySignedOrder,
  TokenKey,
  TradingPeer,
  VaportradeMessage,
} from "../../utils/utils";
import { PickAmountWindow } from "./PickAmountWindow";
import { Tabs } from "../Tabs";
import { useImmer } from "use-immer";
import tradeIcon from "./send.png";
import tradeIconDisabled from "./sendDisabled.png";
import loadingIcon from "../../icons/loadingIcon.gif";
import approveIcon from "../../icons/approve.png";
import { ChainId } from "@0xsequence/network";
import { NftSwap } from "@traderxyz/nft-swap-sdk";
import { ContractInfo } from "0xsequence/dist/declarations/src/metadata";
import {
  chainId,
  CollectiblesDB,
  ContractsDB,
  FetchableToken,
  fetchCollectibles,
  fetchContractsForBalances,
  getItems,
} from "./contracts";
import { BaseProvider, Web3Provider } from "@ethersproject/providers";
import { config } from "../../settings";
interface TradeUIProps {
  wallet: sequence.Wallet;
  address: string;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  p2p: P2PT<VaportradeMessage>;
  tradingPartner: TradingPeer;
  updateMyTradeOffer: (
    callback: (items: Array<Item<KnownContractType>>) => void
  ) => void;
}

type TradeButtonStatus =
  | "waiting_for_lockin"
  | "loading_approvals"
  | "ready_for_approvals"
  | "ready_to_sign"
  | "waiting_for_partner"
  | "submitting_order";

export function TradeUI({
  wallet,
  indexer,
  metadata,
  tradingPartner,
  p2p,
  updateMyTradeOffer,
  address,
}: TradeUIProps) {
  const [nftSwap, setNFTSwap] = useState<NftSwap | null>(null);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [myOrderSent, setMyOrderSent] = useState(false);
  const [
    pickBalanceItem,
    setPickBalanceItem,
  ] = useState<Item<KnownContractType> | null>(null);

  // Metadata about assets
  const [tokensToFetch, updateTokensToFetch] = useImmer<FetchableToken[]>([]);
  const [collectibles, updateCollectibles] = useImmer<CollectiblesDB>(
    new Map()
  );
  const [contracts, updateContracts] = useImmer<ContractsDB>(new Map());

  const [error, setError] = useState<string | null>(null);

  const [requiredApprovals, updateRequiredApprovals] = useImmer<
    Map<TokenKey, boolean | Promise<boolean>>
  >(new Map());

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

  useEffect(() => {
    const provider = wallet.getProvider(ChainId.POLYGON);

    if (!provider) {
      throw new Error("Failed to get Provider from Sequence");
    }

    const nftSwap = new NftSwap(
      // HACK omg todo
      (wallet.getSigner() as unknown) as BaseProvider,
      // HACK :D omg i hope this doesn't explode
      ChainId.POLYGON as 1,
      {
        // also maybe a bug? this doesn't fill in the exchangeAddress in buildOrder
        exchangeContractAddress: config.zeroExContractAddress,
      }
    );
    setNFTSwap(nftSwap);
  }, [wallet]);

  useEffect(() => {
    setOfferAccepted(false);
    setMyOrderSent(false);
  }, [tradingPartner.myTradeOffer, tradingPartner.tradeOffer]);

  useEffect(() => {
    requestTokensFetch(tradingPartner.tradeOffer);
  }, [requestTokensFetch, tradingPartner.tradeOffer]);

  useEffect(() => {
    p2p.send(tradingPartner.peer, {
      type: "offer",
      offer: tradingPartner.myTradeOffer.map((item) => ({
        type: item.type,
        contractAddress: item.contractAddress,
        balance: item.balance.toString(),
        originalBalance: item.originalBalance.toString(),
        tokenID: item.tokenID,
        decimals: item.decimals,
      })),
    });
  }, [p2p, tradingPartner.peer, tradingPartner.myTradeOffer]);

  // Get all contracts for user's balances
  useEffect(() => {
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
          ? setError(`${err.name}\n${err.message}\n${err.stack}`)
          : setError(JSON.stringify(err, undefined, 2))
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
        .filter((c) => c.type === "ERC1155");
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
    metadata,
    tokensToFetch,
    contracts,
    collectibles,
    updateCollectibles,
  ]);

  // Check if we need to approve any tokens for swapping
  useEffect(() => {
    if (!nftSwap) {
      return;
    }

    const needToFetchApprovalStatus = tradingPartner.myTradeOffer
      .map(itemToSwapItem)
      .map((item) => ({
        item,
        tokenKey: getTokenKey(chainId, item.tokenAddress, item.tokenId),
      }))
      // Don't load any token status we're already trying to load.
      .filter(({ tokenKey }) => !requiredApprovals.has(tokenKey));
    updateRequiredApprovals((items) => {
      for (const { item, tokenKey } of needToFetchApprovalStatus) {
        const approvalStatusPromise = nftSwap
          .loadApprovalStatus(item, address, {
            exchangeProxyContractAddressForAsset: config.zeroExContractAddress,
            chainId,
            provider: wallet.getProvider(chainId),
          })
          .then((status) => status.tokenIdApproved || status.contractApproved);
        items.set(tokenKey, approvalStatusPromise);

        // Update the map after we fetch the status
        approvalStatusPromise.then((isApproved) => {
          updateRequiredApprovals((items) => {
            items.set(tokenKey, isApproved);
          });
        });
      }
    });
  });

  const bothPlayersAccepted =
    offerAccepted && tradingPartner.tradeStatus.type !== "negotiating";

  const iGoFirst = doIGoFirst(address, tradingPartner.address);

  const myOfferTokenKeys = tradingPartner.myTradeOffer.map((item) => ({
    item,
    key: getTokenKey(chainId, item.contractAddress, item.tokenID),
  }));
  const stillLoadingApprovalStatus = myOfferTokenKeys.some(
    ({ key }) => typeof requiredApprovals.get(key) !== "boolean"
  );
  const tokensThatNeedApproval =
    !stillLoadingApprovalStatus &&
    myOfferTokenKeys.filter(({ key }) => requiredApprovals.get(key) !== true);

  let tradeButtonStatus: TradeButtonStatus;
  if (!bothPlayersAccepted) {
    // haven't checked boxes, wait for those.
    tradeButtonStatus = "waiting_for_lockin";
  } else if (stillLoadingApprovalStatus) {
    // haven't loaded token approval statuses, wait for those
    tradeButtonStatus = "loading_approvals";
  } else if (tokensThatNeedApproval && tokensThatNeedApproval.length) {
    // let player approve tokens
    tradeButtonStatus = "ready_for_approvals";
  } else {
    // everything ready to trade!
    if (iGoFirst) {
      if (!myOrderSent) {
        // first player needs to sign, if they haven't already
        tradeButtonStatus = "ready_to_sign";
      } else {
        // first player's order signed & sent, wait for partner
        tradeButtonStatus = "waiting_for_partner";
      }
    } else {
      if (tradingPartner.tradeStatus.type === "signedOrder") {
        // 2nd player needs to accept order
        tradeButtonStatus = "ready_to_sign";
      } else {
        // 2nd player needs to wait for signed order from 1st player
        tradeButtonStatus = "waiting_for_partner";
      }
    }
  }
  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="itemSections">
          {error ? <div className="error">{error}</div> : null}
          <Tabs
            style={{ flex: "1" }}
            tabs={[
              {
                title: "My Wallet",
                contents: (
                  <WalletContentsBox
                    accountAddress={address}
                    indexer={indexer}
                    collectibles={collectibles}
                    contracts={contracts}
                    requestTokensFetch={requestTokensFetch}
                    onItemSelected={setPickBalanceItem}
                    subtractItems={tradingPartner.myTradeOffer}
                  />
                ),
              },
              ...(tradingPartner
                ? [
                    {
                      title: "Trading Partner's Wallet",
                      contents: (
                        <WalletContentsBox
                          accountAddress={tradingPartner.address}
                          indexer={indexer}
                          collectibles={collectibles}
                          contracts={contracts}
                          requestTokensFetch={requestTokensFetch}
                          onItemSelected={() => {
                            // noop
                          }}
                          subtractItems={tradingPartner.tradeOffer}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
          {nftSwap ? (
            <div className="offers">
              <DetailsSection title="My trade offer">
                <TradeOffer
                  items={tradingPartner.myTradeOffer}
                  onItemSelected={(item) => {
                    // swap current balance :)
                    const diff = item.originalBalance.minus(item.balance);
                    setPickBalanceItem({ ...item, balance: diff });
                  }}
                />
              </DetailsSection>
              <div className="acceptOffer">
                <Checkbox
                  // TODO should we prevent you from un-locking-in once you send the order to your trading partner?
                  isDisabled={
                    tradingPartner.myTradeOffer.length === 0 &&
                    tradingPartner.tradeOffer.length === 0
                  }
                  checked={offerAccepted}
                  onChange={() => {
                    const newAcceptedState = !offerAccepted;
                    setOfferAccepted(newAcceptedState);
                    p2p.send(tradingPartner.peer, {
                      type: "lockin",
                      isLocked: newAcceptedState,
                      hash: "", // TODO
                    });
                  }}
                  id="myAccept"
                  label="Accept Offer"
                />
                <ButtonForm
                  isDisabled={!tradeButtonStates[tradeButtonStatus].enabled}
                  onClick={async () => {
                    // disable this button ? TODO

                    // Do approvals on-click!
                    if (
                      tradeButtonStatus === "ready_for_approvals" &&
                      tokensThatNeedApproval
                    ) {
                      // TODO status for approval in progress
                      const approvalTxs = tokensThatNeedApproval.map(
                        ({ item }) =>
                          nftSwap.approveTokenOrNftByAsset(
                            itemToSwapItem(item),
                            address,
                            {
                              provider: (wallet.getSigner(
                                ChainId.POLYGON
                              ) as unknown) as Web3Provider,
                              chainId: ChainId.POLYGON,
                              exchangeProxyContractAddressForAsset:
                                config.zeroExContractAddress,
                            }
                          )
                      );
                      await Promise.all(approvalTxs).then(() => {
                        // after we go thru all approval TXs, re-check approval status of each.
                        updateRequiredApprovals((approvals) => {
                          for (const { key } of tokensThatNeedApproval) {
                            approvals.delete(key);
                          }
                        });
                      });
                    } else if (tradeButtonStatus === "ready_to_sign") {
                      // TODO status for signing in progress
                      if (iGoFirst) {
                        // sign and submit order to other player
                        const order = buildOrder(nftSwap, [
                          {
                            address: address,
                            items: tradingPartner.myTradeOffer,
                          },
                          {
                            address: tradingPartner.address,
                            items: getItems({
                              balances: tradingPartner.tradeOffer,
                              contracts,
                              collectibles,
                            }).filter(isItemWithKnownContractType),
                          },
                        ]);
                        console.log("[trade] waiting for signed order...");
                        const signedOrder = await nftSwap.signOrder(
                          order,
                          address,
                          wallet.getSigner(chainId)
                        );
                        console.log(
                          "[trade] got signed order, sending to peer"
                        );

                        p2p?.send(tradingPartner.peer, {
                          type: "accept",
                          order: networkifySignedOrder(signedOrder),
                        });
                        console.log("[trade] waiting for peer to accept");
                        setMyOrderSent(true);
                      } else {
                        if (tradingPartner.tradeStatus.type !== "signedOrder") {
                          throw new Error(
                            "expected signed order to exist for p2 when clicking button"
                          );
                        }
                        // we're good. submit it on-chain.
                        console.log(
                          "[trade] got signed order from peer, button clicked. submitting order on-chain"
                        );
                        const fillTx = await nftSwap.fillSignedOrder(
                          denetworkifySignedOrder(
                            tradingPartner.tradeStatus.signedOrder
                          ),
                          {
                            //TODO wtf??? this is an ugly hack
                            signer: (wallet.getSigner(
                              chainId
                            ) as unknown) as BaseProvider,
                          }
                        );
                        console.log("[trade] waiting for order completion.");
                        const fillTxReceipt = await nftSwap.awaitTransactionHash(
                          fillTx
                        );
                        console.log(
                          `[trade] 🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`
                        );
                      }
                    }
                  }}
                >
                  <img
                    src={tradeButtonStates[tradeButtonStatus].icon}
                    alt={tradeButtonStates[tradeButtonStatus].altText}
                    title={tradeButtonStates[tradeButtonStatus].altText}
                    style={{
                      width: "32px",
                      height: "32px",
                    }}
                  />
                </ButtonForm>
                <Checkbox
                  readOnly
                  checked={tradingPartner.tradeStatus.type !== "negotiating"}
                  id="partnerAccept"
                  label="Partner Accepts"
                  isDisabled
                />
              </div>
              <DetailsSection title="Partner's trade offer">
                <TradeOffer
                  items={getItems({
                    balances: tradingPartner.tradeOffer,
                    contracts,
                    collectibles,
                  }).filter(isItemWithKnownContractType)}
                  onItemSelected={() => {
                    // nothing happens when you double click your trading partner's items.
                  }}
                />
              </DetailsSection>
            </div>
          ) : null}
        </div>
      </DndProvider>
      {pickBalanceItem ? (
        <PickAmountWindow
          type="offer"
          item={pickBalanceItem}
          onClose={() => setPickBalanceItem(null)}
          onAdd={(amount) => {
            setPickBalanceItem(null);
            updateMyTradeOffer((items) => {
              const matchingItem = items.find(
                (i) =>
                  i.contractAddress === pickBalanceItem.contractAddress &&
                  i.tokenID === pickBalanceItem.tokenID
              );

              if (matchingItem) {
                if (amount.isZero()) {
                  items.splice(items.indexOf(matchingItem), 1);
                } else {
                  matchingItem.balance = amount;
                }
              } else if (!amount.isZero()) {
                items.push({ ...pickBalanceItem, balance: amount });
              }
            });
          }}
        />
      ) : null}
    </>
  );
}

export const tradeButtonStates: {
  [K in TradeButtonStatus]: { icon: string; enabled: boolean; altText: string };
} = {
  loading_approvals: {
    icon: loadingIcon,
    altText: "Loading token approval statuses...",
    enabled: false,
  },
  ready_for_approvals: {
    icon: approveIcon,
    altText: "Approve token transfers",
    enabled: true,
  },
  ready_to_sign: {
    icon: tradeIcon,
    altText: "Sign trade offer",
    enabled: true,
  },
  submitting_order: {
    icon: loadingIcon,
    altText: "Waiting for trade to complete...",
    enabled: false,
  },
  waiting_for_lockin: {
    icon: tradeIconDisabled,
    altText: "Waiting for lock-in...",
    enabled: false,
  },
  waiting_for_partner: {
    icon: loadingIcon,
    altText: "Waiting for partner...",
    enabled: false,
  },
};
