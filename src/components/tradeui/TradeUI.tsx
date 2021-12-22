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
  doIGoFirst,
  getContractKey,
  getTokenKey,
  isItemWithKnownContractType,
  Item,
  itemToSwapItem,
  KnownContractType,
  TokenKey,
  TradingPeer,
  VaportradeMessage,
  zero,
} from "../../utils/utils";
import { PickAmountWindow } from "./PickAmountWindow";
import { Tabs } from "../Tabs";
import { useImmer } from "use-immer";
import tradeIcon from "./send.png";
import tradeIconDisabled from "./sendDisabled.png";
import loadingIcon from "../../icons/loadingIcon.gif";
import approveIcon from "../../icons/approve.png";
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
import { Web3Provider } from "@ethersproject/providers";
import { useWeb3React } from "@web3-react/core";
import { formatBytes32String, randomBytes } from "ethers/lib/utils";
import { BigNumber } from "@ethersproject/bignumber";
import { config } from "../../settings";
interface TradeUIProps {
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  nftSwap: NftSwap;
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
  | "waiting_for_approvals"
  | "ready_to_sign"
  | "waiting_for_partner"
  | "waiting_for_order_completion";

export function TradeUI({
  indexer,
  metadata,
  tradingPartner,
  p2p,
  nftSwap,
  updateMyTradeOffer,
}: TradeUIProps) {
  const { account: address, library } = useWeb3React<Web3Provider>();
  if (!address || !library) {
    throw new Error("No address when TradeUI open!");
  }

  const [lockedIn, setLockedIn] = useState<
    false | "sending" | { hash: string }
  >(false);
  const [myOrderSent, setMyOrderSent] = useState<
    false | { expiryTime: number }
  >(false);
  const [orderSuccess, setOrderSuccess] = useState<false | { txHash: string }>(
    false
  );

  const [
    pickBalanceItem,
    setPickBalanceItem,
  ] = useState<Item<KnownContractType> | null>(null);

  const [timeLeftUntilTradeExpires, setTimeLeftUntilTradeExpires] = useState(
    "5:00"
  );

  // Metadata about assets
  const [tokensToFetch, updateTokensToFetch] = useImmer<FetchableToken[]>([]);
  const [collectibles, updateCollectibles] = useImmer<CollectiblesDB>(
    new Map()
  );
  const [contracts, updateContracts] = useImmer<ContractsDB>(new Map());

  const [error, setError] = useState<string | null>(null);

  const [requiredApprovals, updateRequiredApprovals] = useImmer<
    Map<TokenKey, boolean | Promise<boolean> | "approving">
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
    if (error) {
      if (typeof lockedIn === "object") {
        setLockedIn(false);
      }
      if (myOrderSent) {
        setMyOrderSent(false);
      }
    }
  }, [error, lockedIn, myOrderSent]);

  useEffect(() => {
    setLockedIn(false);
  }, [tradingPartner.myTradeOffer, tradingPartner.tradeOffer]);

  useEffect(() => {
    if (
      (!lockedIn || tradingPartner.tradeStatus.type === "negotiating") &&
      myOrderSent
    ) {
      setMyOrderSent(false);
    }
  }, [lockedIn, myOrderSent, tradingPartner]);

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
          .loadApprovalStatus(item, address)
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
    lockedIn && tradingPartner.tradeStatus.type !== "negotiating";

  const iGoFirst = doIGoFirst(address, tradingPartner.address);

  const myOfferTokenKeys = tradingPartner.myTradeOffer.map((item) => ({
    item,
    key: getTokenKey(chainId, item.contractAddress, item.tokenID),
  }));
  const stillLoadingApprovalStatus = myOfferTokenKeys.some(
    ({ key }) => typeof requiredApprovals.get(key) !== "boolean"
  );
  const waitingForApproval = myOfferTokenKeys.some(
    ({ key }) => requiredApprovals.get(key) === "approving"
  );
  const tokensThatNeedApproval =
    !stillLoadingApprovalStatus &&
    myOfferTokenKeys.filter(({ key }) => requiredApprovals.get(key) !== true);

  let tradeButtonStatus: TradeButtonStatus;
  if (!bothPlayersAccepted) {
    // haven't checked boxes, wait for those.
    tradeButtonStatus = "waiting_for_lockin";
  } else if (waitingForApproval) {
    tradeButtonStatus = "waiting_for_approvals";
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
      if (myOrderSent) {
        tradeButtonStatus = "waiting_for_order_completion";
      } else if (
        tradingPartner.tradeStatus.type === "signedOrder" &&
        timeLeftUntilTradeExpires !== "0:00"
      ) {
        // 2nd player needs to accept order
        tradeButtonStatus = "ready_to_sign";
      } else {
        // 2nd player needs to wait for signed order from 1st player
        tradeButtonStatus = "waiting_for_partner";
      }
    }
  }
  const myHalfOfOrder = {
    address: address,
    items: tradingPartner.myTradeOffer,
  };
  const theirHalfOfOrder = {
    address: tradingPartner.address,
    items: getItems({
      balances: tradingPartner.tradeOffer,
      contracts,
      collectibles,
    }).filter(isItemWithKnownContractType),
  };
  const order = nftSwap
    ? buildOrder(
        nftSwap,
        iGoFirst
          ? [myHalfOfOrder, theirHalfOfOrder]
          : [theirHalfOfOrder, myHalfOfOrder],
        new Date(0),
        fakeSalt
      )
    : null;

  useEffect(() => {
    if (lockedIn && order) {
      if (tradingPartner.tradeStatus.type === "locked_in") {
        const partnerHash = tradingPartner.tradeStatus.orderHash;
        const hash = nftSwap.getOrderHash(order);
        if (partnerHash !== hash) {
          const err = `Got invalid hash from partner lockin\n: Expected ${hash}, got ${partnerHash}`;
          console.error(err);
          setError(err);
        }
      } else if (tradingPartner.tradeStatus.type === "signedOrder") {
        const expiryTime = Number.parseInt(
          tradingPartner.tradeStatus.signedOrder.expirationTimeSeconds,
          10
        );
        const now = Date.now() / 1000;
        if (Number.isNaN(expiryTime) || expiryTime - now > 10 * 60) {
          const err = `Trading partner's order expires at ${expiryTime}, which is more than 10 minutes from now.`;
          console.error(err);
          setError(err);
        }

        const partnerHash = nftSwap.getOrderHash({
          ...tradingPartner.tradeStatus.signedOrder,
          salt: fakeSalt,
          expirationTimeSeconds: zero.toString(),
        });
        const hash = nftSwap.getOrderHash(order);
        if (partnerHash !== hash) {
          const err = `Got invalid hash from partner submitting signed order\n: Expected ${hash}, got ${partnerHash}`;
          console.error(err);
          setError(err);
        }
      }
    }
  }, [
    lockedIn,
    nftSwap,
    order,
    tradingPartner.myTradeOffer,
    tradingPartner.tradeOffer,
    tradingPartner.tradeStatus,
  ]);

  useEffect(() => {
    if (order && lockedIn === "sending") {
      const hash = nftSwap.getOrderHash(order);
      p2p.send(tradingPartner.peer, {
        type: "lockin",
        lockedOrder: { hash },
      });
      setLockedIn({ hash });
    } else if (!lockedIn) {
      p2p.send(tradingPartner.peer, {
        type: "lockin",
        lockedOrder: false,
      });
      setTimeLeftUntilTradeExpires("");
    }
  }, [nftSwap, order, p2p, tradingPartner.peer, lockedIn]);

  useEffect(() => {
    const expiryTimeString =
      tradingPartner.tradeStatus.type === "signedOrder"
        ? tradingPartner.tradeStatus.signedOrder.expirationTimeSeconds
        : typeof myOrderSent === "object"
        ? `${myOrderSent.expiryTime}`
        : "";
    if (expiryTimeString === "") {
      return;
    }
    const expiryTime = Number.parseInt(expiryTimeString, 10);
    if (Number.isNaN(expiryTime)) {
      return;
    }
    const timer = setInterval(
      () =>
        setTimeLeftUntilTradeExpires(() => {
          // 30s buffer for network & desync.
          const timeLeft = (expiryTime - 30) * 1000 - Date.now();

          const minutes = `${Math.max(
            0,
            Math.floor((timeLeft % 3.6e6) / 6e4)
          )}`;
          const seconds = `${Math.max(0, Math.floor((timeLeft % 6e4) / 1000))}`;
          return `${minutes}:${(seconds.length < 2 ? "0" : "") + seconds}`;
        }),
      1000
    );
    return () => clearInterval(timer);
  }, [tradingPartner.tradeStatus, myOrderSent]);

  useEffect(() => {
    if (myOrderSent && timeLeftUntilTradeExpires === "0:00") {
      setMyOrderSent(false);
      p2p.send(tradingPartner.peer, {
        type: "offer",
        offer: [],
      });
    }
  }, [myOrderSent, timeLeftUntilTradeExpires, p2p, tradingPartner.peer]);

  if (orderSuccess) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="successfulTradeBox">
          <div className="oneSide">
            <TradeOffer items={tradingPartner.myTradeOffer} />
            <div className="successLabel">You sent</div>
          </div>
          <div className="successfulTrade">
            <div className="successfulTitle">Trade successful!</div>
            <a
              href={`https://polygonscan.com/tx/${orderSuccess.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Polygonscan
            </a>
            <img
              src={tradeButtonStates.ready_to_sign.icon}
              alt={"traded for"}
              className="successfulTradeIcon"
            />
          </div>
          <div className="oneSide">
            <TradeOffer
              items={getItems({
                balances: tradingPartner.tradeOffer,
                contracts,
                collectibles,
              }).filter(isItemWithKnownContractType)}
            />
            <div className="successLabel">You received</div>
          </div>
        </div>
      </DndProvider>
    );
  }
  if (error) {
    return (
      <div>
        <div className="error">{error}</div>
        <ButtonForm onClick={() => setError(null)}>Clear Error</ButtonForm>
      </div>
    );
  }
  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="itemSections">
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
          {nftSwap && order ? (
            <div className="offers">
              <DetailsSection title="My trade offer">
                <TradeOffer
                  items={tradingPartner.myTradeOffer}
                  onItemSelected={(item) => {
                    // swap current balance :)
                    const diff = item.originalBalance.sub(item.balance);
                    setPickBalanceItem({ ...item, balance: diff });
                  }}
                />
              </DetailsSection>
              <section className="DetailsSection window__section acceptOffer">
                <div className="DetailsSection__title">
                  {tradeButtonStatus === "ready_to_sign" &&
                  tradingPartner.tradeStatus.type === "signedOrder"
                    ? `Submit trade (${timeLeftUntilTradeExpires})`
                    : tradeButtonStatus === "waiting_for_partner" &&
                      typeof myOrderSent === "object"
                    ? `Waiting for order on-chain (${timeLeftUntilTradeExpires})`
                    : tradeButtonStates[tradeButtonStatus].altText}
                </div>

                <div className="acceptOfferContents">
                  <Checkbox
                    isDisabled={
                      myOrderSent !== false ||
                      (tradingPartner.myTradeOffer.length === 0 &&
                        tradingPartner.tradeOffer.length === 0)
                    }
                    checked={Boolean(lockedIn)}
                    onChange={() => {
                      const newAcceptedState = !lockedIn;
                      setLockedIn(newAcceptedState ? "sending" : false);
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
                        updateRequiredApprovals((approvals) => {
                          for (const { key } of tokensThatNeedApproval) {
                            approvals.set(key, "approving");
                          }
                        });
                        const approvalTxs = tokensThatNeedApproval.map(
                          ({ item }) =>
                            nftSwap
                              .approveTokenOrNftByAsset(
                                itemToSwapItem(item),
                                address
                              )
                              .then((tx) =>
                                nftSwap.awaitTransactionHash(tx.hash)
                              )
                        );
                        await Promise.allSettled(approvalTxs);
                        // after we go thru all approval TXs, re-check approval status of each.
                        updateRequiredApprovals((approvals) => {
                          for (const { key } of tokensThatNeedApproval) {
                            approvals.delete(key);
                          }
                        });
                      } else if (tradeButtonStatus === "ready_to_sign") {
                        // TODO status for signing in progress
                        if (iGoFirst) {
                          // sign and submit order to other player

                          console.log(
                            "[trade] waiting for user to sign order..."
                          );
                          const expiryTime =
                            Math.floor(new Date().getTime() / 1000) + 5 * 60;
                          const signedOrder = await nftSwap.signOrder(
                            {
                              ...order,
                              salt: BigNumber.from(randomBytes(32)).toString(), // get a real salt to sign this order
                              expirationTimeSeconds: BigNumber.from(
                                expiryTime
                              ).toString(), // and get a real timestamp of now + 5 minutes
                            },
                            address,
                            library.getSigner()
                          );
                          console.log(
                            "[trade] got signed order, sending to peer"
                          );

                          p2p?.send(tradingPartner.peer, {
                            type: "accept",
                            order: signedOrder,
                          });
                          console.log("[trade] waiting for peer to accept");
                          setMyOrderSent({ expiryTime });
                        } else {
                          if (
                            tradingPartner.tradeStatus.type !== "signedOrder"
                          ) {
                            throw new Error(
                              "expected signed order to exist for p2 when clicking button"
                            );
                          }
                          // we're good. submit it on-chain.
                          console.log(
                            "[trade] got signed order from peer, button clicked. submitting order on-chain"
                          );
                          const fillTx = await nftSwap.fillSignedOrder(
                            tradingPartner.tradeStatus.signedOrder
                          );
                          setMyOrderSent({ expiryTime: 0 }); // n/a
                          console.log("[trade] waiting for order completion.");
                          const fillTxReceipt = await nftSwap.awaitTransactionHash(
                            fillTx.hash
                          );
                          console.log(
                            `[trade] 🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`
                          );
                          if (fillTxReceipt.status === 1) {
                            setOrderSuccess({
                              txHash: fillTxReceipt.transactionHash,
                            });
                          } else {
                            setError(
                              `Error making trade: Transaction ${fillTxReceipt.transactionHash} failed.`
                            );
                          }
                        }
                      }
                    }}
                  >
                    <img
                      src={tradeButtonStates[tradeButtonStatus].icon}
                      alt={tradeButtonStates[tradeButtonStatus].altText}
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
              </section>
              <DetailsSection title="Partner's trade offer">
                <TradeOffer
                  items={getItems({
                    balances: tradingPartner.tradeOffer,
                    contracts,
                    collectibles,
                  }).filter(isItemWithKnownContractType)}
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
      {config.debugModeSetMeToTheStringTrue === "true" ? (
        <div>
          <ButtonForm onClick={() => setOrderSuccess({ txHash: "dummytx" })}>
            DEBUG set success true
          </ButtonForm>
        </div>
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
  waiting_for_approvals: {
    icon: loadingIcon,
    altText: "Waiting for token approvals...",
    enabled: false,
  },
  ready_to_sign: {
    icon: tradeIcon,
    altText: "Sign trade offer",
    enabled: true,
  },
  waiting_for_order_completion: {
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

const fakeSalt = formatBytes32String("vaportrade_fake_salt");
