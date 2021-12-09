import { useCallback, useEffect, useState } from "react";
import { sequence } from "0xsequence";
import "./TradeUI.css";
import P2PT from "p2pt";
import { ButtonForm, Checkbox, DetailsSection } from "packard-belle";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { EllipseAnimation } from "../../utils/EllipseAnimation";
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
  TradingPeer,
  VaportradeMessage,
} from "../../utils/utils";
import { PickAmountWindow } from "./PickAmountWindow";
import { Tabs } from "../Tabs";
import { useImmer } from "use-immer";
import tradeIcon from "./send.png";
import { ChainId } from "@0xsequence/network";
import { NftSwap } from "@traderxyz/nft-swap-sdk";
import { orderHashUtils } from "@0x/order-utils";
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
interface TradeUIProps {
  wallet: sequence.Wallet;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  p2p: P2PT<VaportradeMessage> | null;
  tradingPartner: TradingPeer | null;
}

export function TradeUI({
  wallet,
  indexer,
  metadata,
  tradingPartner,
  p2p,
}: TradeUIProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [nftSwap, setNFTSwap] = useState<NftSwap | null>(null);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [
    pickBalanceItem,
    setPickBalanceItem,
  ] = useState<Item<KnownContractType> | null>(null);
  const [myTradeOffer, updateMyTradeOffer] = useImmer<
    Array<Item<KnownContractType>>
  >([]);

  // Metadata about assets
  const [tokensToFetch, updateTokensToFetch] = useImmer<FetchableToken[]>([]);
  const [collectibles, updateCollectibles] = useImmer<CollectiblesDB>(
    new Map()
  );
  const [contracts, updateContracts] = useImmer<ContractsDB>(new Map());

  const [error, setError] = useState<string | null>(null);

  const requestTokensFetch = useCallback(
    (tokens: FetchableToken[]) =>
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
      }),
    [updateTokensToFetch]
  );

  useEffect(() => {
    wallet.getAddress().then(setAddress);
  }, [wallet]);

  useEffect(() => {
    const provider = wallet.getProvider(ChainId.POLYGON);

    if (!provider) {
      throw new Error("Failed to get Provider from Sequence");
    }

    const nftSwap = new NftSwap(
      provider,
      // HACK :D omg i hope this doesn't explode
      ChainId.POLYGON as 1,
      {
        // also maybe a bug? this doesn't fill in the exchangeAddress in buildOrder
        exchangeContractAddress: "0x1119E3e8919d68366f56B74445eA2d10670Ac9eF",
      }
    );
    setNFTSwap(nftSwap);
  }, [wallet]);

  useEffect(() => {
    setOfferAccepted(false);
  }, [myTradeOffer, tradingPartner?.tradeOffer]);

  useEffect(() => {
    if (!tradingPartner?.tradeOffer) {
      return;
    }
    requestTokensFetch(tradingPartner.tradeOffer);
  }, [requestTokensFetch, tradingPartner?.tradeOffer]);

  useEffect(() => {
    if (!p2p || !tradingPartner?.peer) {
      return;
    }
    p2p.send(tradingPartner.peer, {
      type: "offer",
      offer: myTradeOffer.map((item) => ({
        type: item.type,
        contractAddress: item.contractAddress,
        balance: item.balance.toString(),
        originalBalance: item.originalBalance.toString(),
        tokenID: item.tokenID,
        decimals: item.decimals,
      })),
    });
  }, [p2p, tradingPartner?.peer, myTradeOffer]);

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

  useEffect(() => {
    if (!p2p || !tradingPartner?.peer || !nftSwap || !address) {
      return;
    }
    p2p.send(tradingPartner.peer, {
      type: "lockin",
      isLocked: offerAccepted,
      hash: offerAccepted
        ? orderHashUtils.getOrderHash(
            buildOrder(nftSwap, [
              {
                address: address,
                items: myTradeOffer,
              },
              {
                address: tradingPartner.address,
                items: getItems(
                  tradingPartner.tradeOffer,
                  contracts,
                  collectibles
                ).filter(isItemWithKnownContractType),
              },
            ])
          )
        : "",
    });
  }, [
    nftSwap,
    p2p,
    tradingPartner,
    offerAccepted,
    address,
    myTradeOffer,
    collectibles,
    contracts,
  ]);
  const bothPlayersAccepted =
    offerAccepted && tradingPartner?.tradeStatus?.type === "locked_in";

  const iGoFirst =
    address && tradingPartner && doIGoFirst(address, tradingPartner.address);

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="itemSections">
          {error ? <div className="error">{error}</div> : null}
          <Tabs
            style={{ flex: "1", height: "100%" }}
            tabs={[
              {
                title: "My Wallet",
                contents: address ? (
                  <WalletContentsBox
                    accountAddress={address}
                    indexer={indexer}
                    collectibles={collectibles}
                    contracts={contracts}
                    requestTokensFetch={requestTokensFetch}
                    onItemSelected={
                      tradingPartner ? setPickBalanceItem : () => {}
                    }
                    subtractItems={myTradeOffer}
                  />
                ) : (
                  <div>
                    Loading your wallet
                    <EllipseAnimation />
                  </div>
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
                            //noop
                          }}
                          subtractItems={tradingPartner.tradeOffer}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
          {tradingPartner && nftSwap && address ? (
            <div className="offers">
              <DetailsSection title="My trade offer">
                <TradeOffer
                  items={myTradeOffer}
                  onItemSelected={(item) => {
                    // swap current balance :)
                    const diff = item.originalBalance.minus(item.balance);
                    setPickBalanceItem({ ...item, balance: diff });
                  }}
                />
              </DetailsSection>
              <div className="acceptOffer">
                <Checkbox
                  checked={offerAccepted}
                  onChange={() => {
                    setOfferAccepted(!offerAccepted);
                  }}
                  id="myAccept"
                  label="Accept Offer"
                />
                <ButtonForm
                  isDisabled={
                    !bothPlayersAccepted ||
                    (!iGoFirst &&
                      tradingPartner.tradeStatus.type !== "signedOrder")
                  }
                  onClick={async () => {
                    // disable this button

                    // Check if we need to approve the NFT for swapping
                    const myApprovalStatus = await Promise.all(
                      myTradeOffer.map((item) => {
                        const swapItem = itemToSwapItem(item);
                        return nftSwap
                          .loadApprovalStatus(swapItem, address)
                          .then((status) => ({ swapItem, status }));
                      })
                    );

                    const receipts = [];
                    for (const { swapItem, status } of myApprovalStatus) {
                      if (!status.tokenIdApproved && !status.contractApproved) {
                        receipts.push(
                          (
                            await nftSwap.approveTokenOrNftByAsset(
                              swapItem,
                              address,
                              {
                                provider: (wallet.getSigner(
                                  ChainId.POLYGON
                                ) as unknown) as Web3Provider,
                                chainId: ChainId.POLYGON,
                                exchangeProxyContractAddressForAsset:
                                  "0x1119E3e8919d68366f56B74445eA2d10670Ac9eF",
                              }
                            )
                          )
                            .wait()
                            .then(() =>
                              console.log(
                                "Approved ",
                                swapItem.tokenAddress,
                                swapItem.tokenId
                              )
                            )
                        );
                      }
                    }
                    await Promise.all(receipts);

                    if (iGoFirst) {
                      // sign and submit order

                      const order = buildOrder(nftSwap, [
                        {
                          address: address,
                          items: myTradeOffer,
                        },
                        {
                          address: tradingPartner.address,
                          items: getItems(
                            tradingPartner.tradeOffer,
                            contracts,
                            collectibles
                          ).filter(isItemWithKnownContractType),
                        },
                      ]);
                      console.log("waiting for signed order");
                      const signedOrder = await nftSwap.signOrder(
                        order,
                        address
                      );
                      p2p?.send(tradingPartner.peer, {
                        type: "accept",
                        order: networkifySignedOrder(signedOrder),
                      });
                      console.log("waiting for peer to accept");
                    } else {
                      if (tradingPartner.tradeStatus.type !== "signedOrder") {
                        throw new Error(
                          "expected signed order to exist for p2 when clicking button"
                        );
                      }
                      // we're good. submit it on-chain.
                      console.log("Submitting order on-chain");
                      const fillTx = await nftSwap.fillSignedOrder(
                        denetworkifySignedOrder(
                          tradingPartner.tradeStatus.signedOrder
                        )
                      );
                      console.log("waiting for order completion.");
                      const fillTxReceipt = await nftSwap.awaitTransactionHash(
                        fillTx
                      );
                      console.log(
                        `🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`
                      );
                    }
                  }}
                >
                  <img
                    src={tradeIcon}
                    className={bothPlayersAccepted ? "" : "tradeIconDisabled"}
                    alt="Trade icon"
                    style={{
                      maxWidth: "32px",
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
                  items={getItems(
                    tradingPartner.tradeOffer,
                    contracts,
                    collectibles
                  ).filter(isItemWithKnownContractType)}
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
