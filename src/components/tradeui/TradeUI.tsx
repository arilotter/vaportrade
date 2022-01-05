import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import "./TradeUI.css";
import P2PT from "p2pt";
import {
  ButtonForm,
  ButtonIconSmall,
  Checkbox,
  DetailsSection,
  Radio,
} from "packard-belle";
import { WalletContentsBox } from "./WalletContentsBox";
import { TradeOffer } from "./TradeOffer";
import {
  buildOrder,
  formatTimeLeft,
  getTokenKey,
  getTokenKeyFromToken,
  isItemWithKnownContractType,
  Item,
  itemToSwapItem,
  KnownContractType,
  OrderStatus,
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
import tipIcon from "../../icons/tip.png";
import cancelIcon from "../../icons/cancel.png";
import reloadIcon from "../../icons/reload.png";
import {
  FillEvent,
  NftSwap,
  OrderInfoStruct,
  SignedOrder,
} from "@traderxyz/nft-swap-sdk";
import { getItems } from "./contracts";
import { Web3Provider } from "@ethersproject/providers";
import { useWeb3React } from "@web3-react/core";
import {
  formatBytes32String,
  formatEther,
  randomBytes,
} from "ethers/lib/utils";
import { BigNumber } from "@ethersproject/bignumber";
import { config, LS_SIGNED_ORDER_CACHE_KEY } from "../../settings";
import { TypedListener } from "@traderxyz/nft-swap-sdk/dist/contracts/common";
import { verifiedContracts } from "../../utils/verified";
import { chainConfigs, SupportedChain } from "../../utils/multichain";
import { ChainPicker } from "../../utils/ChainPicker";
import { isConnectorMultichain } from "../../web3/connectors";
import { SequenceConnector } from "../../web3/Web3ReactSequenceConnector";
import { SafeLink } from "../../utils/SafeLink";
import { IndexerContext } from "../../SequenceMetaProvider";

interface TradeUIProps {
  p2p: P2PT<VaportradeMessage>;
  tradingPartner: TradingPeer;
  updateMyTradeOffer: (
    callback: (items: Array<Item<KnownContractType>>) => void
  ) => void;
  updateGoesFirst: (goesFirstAddress: string) => void;
  updateChain: (chainID: SupportedChain) => void;
  openWalletInfo: (chainID: SupportedChain) => void;
  setWalletIsOpen: (isOpen: boolean) => void;
  showTipUI: () => void;
}

type TradeButtonStatus =
  | "waiting_for_offer"
  | "waiting_for_fee_payment_selection"
  | "waiting_for_lockin"
  | "loading_approvals"
  | "ready_for_approvals"
  | "waiting_for_approvals"
  | "ready_to_sign"
  | "waiting_for_partner"
  | "waiting_for_order_completion";

const DEFAULT_TIME = 5 * 60 * 1000;

interface CachedSignedOrder {
  signedOrder: SignedOrder;
  chainID: SupportedChain;
  myItems: Array<Item<"ERC20" | "ERC721" | "ERC1155">>;
  theirItems: Array<Item<"ERC20" | "ERC721" | "ERC1155">>;
}
export function TradeUI({
  tradingPartner,
  p2p,
  updateMyTradeOffer: externalUpdateMyTradeOffer,
  updateGoesFirst,
  updateChain,
  openWalletInfo,
  setWalletIsOpen,
  showTipUI,
}: TradeUIProps) {
  const {
    account: address,
    chainId: walletChainID,
    connector,
    library,
  } = useWeb3React<Web3Provider>();
  if (!address || !connector || !library) {
    throw new Error("No address when TradeUI open!");
  }
  const {
    getEtherBalance,
    requestTokenMetadataFetch,
    contracts,
    collectibles,
  } = useContext(IndexerContext);
  const [nftSwap, setNftSwap] = useState<NftSwap | null>(null);
  useEffect(() => {
    setNftSwap(null);
    (async () => {
      const provider: Web3Provider | undefined = await (connector instanceof
      SequenceConnector
        ? connector.getProvider(tradingPartner.chainID)
        : library);
      if (!provider) {
        return;
      }
      setNftSwap(
        new NftSwap(provider, provider.getSigner(), tradingPartner.chainID)
      );
    })();
  }, [connector, tradingPartner.chainID, library]);

  const [lockedIn, setLockedIn] = useState<
    Readonly<{
      lockedIn: false | { hash: string };
      sent: boolean;
    }>
  >({ lockedIn: false, sent: false });
  const [myOrderSent, setMyOrderSent] = useState<false | SignedOrder>(false);

  const [signedOrderCache, _internalUpdateSignedOrderCache] = useState<
    ReadonlyArray<Readonly<CachedSignedOrder>>
  >(JSON.parse(localStorage.getItem(LS_SIGNED_ORDER_CACHE_KEY) ?? "[]"));

  const updateSignedOrderCache = useCallback(
    (signedOrders: ReadonlyArray<Readonly<CachedSignedOrder>>) => {
      _internalUpdateSignedOrderCache(signedOrders);
      localStorage.setItem(
        LS_SIGNED_ORDER_CACHE_KEY,
        JSON.stringify(signedOrders)
      );
    },
    []
  );

  const [orderSuccess, setOrderSuccess] = useState<
    | false
    | {
        txHash: string;
        chainID: SupportedChain;
        myItems: Array<Item<"ERC20" | "ERC721" | "ERC1155">>;
        theirItems: Array<Item<"ERC20" | "ERC721" | "ERC1155">>;
      }
  >(false);

  const [
    pickBalanceItem,
    setPickBalanceItem,
  ] = useState<Item<KnownContractType> | null>(null);

  const [hardError, setHardError] = useState<{
    error: string;
    txHash?: string;
  } | null>(null);
  const [softWarning, setSoftWarning] = useState<string | null>(null);

  const [requiredApprovals, updateRequiredApprovals] = useImmer<
    Map<TokenKey, boolean | Promise<boolean> | "approving">
  >(new Map());

  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    p2p.send(tradingPartner.peer, {
      type: "set_chain",
      chainID: tradingPartner.chainID,
    });
  }, [p2p, tradingPartner.peer, tradingPartner.chainID]);

  const updateMyTradeOffer = useCallback(
    (callback: (items: Item<"ERC20" | "ERC721" | "ERC1155">[]) => void) => {
      setLockedIn({ lockedIn: false, sent: false });
      externalUpdateMyTradeOffer(callback);
    },
    [externalUpdateMyTradeOffer]
  );

  useEffect(() => {
    if (hardError) {
      if (lockedIn.lockedIn) {
        setLockedIn({ lockedIn: false, sent: false });
      }
      if (myOrderSent) {
        setMyOrderSent(false);
      }
    }
  }, [hardError, lockedIn, myOrderSent]);

  useEffect(() => {
    setLockedIn({ lockedIn: false, sent: false });
  }, [
    tradingPartner.myTradeOffer,
    tradingPartner.tradeOffer,
    tradingPartner.goesFirstAddress,
  ]);

  useEffect(() => {
    if (
      (!lockedIn.lockedIn ||
        tradingPartner.tradeStatus.type === "negotiating") &&
      myOrderSent
    ) {
      setMyOrderSent(false);
    }
  }, [lockedIn, myOrderSent, tradingPartner]);

  useEffect(() => {
    requestTokenMetadataFetch(tradingPartner.tradeOffer);
  }, [requestTokenMetadataFetch, tradingPartner.tradeOffer]);

  useEffect(() => {
    p2p.send(tradingPartner.peer, {
      type: "offer",
      offer: tradingPartner.myTradeOffer.map((item) => ({
        type: item.type,
        chainID: item.chainID,
        contractAddress: item.contractAddress,
        balance: item.balance.toString(),
        originalBalance: item.originalBalance.toString(),
        tokenID: item.tokenID,
        decimals: item.decimals,
      })),
    });
  }, [p2p, tradingPartner.peer, tradingPartner.myTradeOffer]);

  useEffect(() => {
    p2p.send(tradingPartner.peer, {
      type: "set_goes_first",
      address: tradingPartner.goesFirstAddress,
    });
  }, [p2p, tradingPartner.peer, tradingPartner.goesFirstAddress]);

  useEffect(() => {
    if (orderSuccess) {
      setLockedIn({ lockedIn: false, sent: false });
      setPickBalanceItem(null);
      setSoftWarning(null);
      updateMyTradeOffer((items) => (items.length = 0));
      updateGoesFirst("");
    }
  }, [orderSuccess, updateMyTradeOffer, updateGoesFirst]);

  // Check if we need to approve any tokens for swapping
  useEffect(() => {
    if (!nftSwap) {
      return;
    }

    const needToFetchApprovalStatus = tradingPartner.myTradeOffer
      .map((item) => ({
        item,
        tokenKey: getTokenKey(item.chainID, item.contractAddress, item.tokenID),
      }))
      // Don't load any token status we're already trying to load.
      .filter(({ tokenKey }) => !requiredApprovals.has(tokenKey));
    updateRequiredApprovals((items) => {
      for (const { item, tokenKey } of needToFetchApprovalStatus) {
        const approvalStatusPromise = nftSwap
          .loadApprovalStatus(itemToSwapItem(item), address)
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
  }, [
    address,
    nftSwap,
    requiredApprovals,
    tradingPartner.myTradeOffer,
    updateRequiredApprovals,
  ]);

  const bothPlayersAccepted =
    lockedIn.lockedIn && tradingPartner.tradeStatus.type !== "negotiating";

  const iGoFirst = tradingPartner.goesFirstAddress === address;

  const myOfferTokenKeys = tradingPartner.myTradeOffer.map((item) => ({
    item,
    key: getTokenKey(item.chainID, item.contractAddress, item.tokenID),
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
  const unverifiedItems = theirHalfOfOrder.items.filter(
    (item) =>
      !verifiedContracts[tradingPartner.chainID].has(item.contractAddress)
  );
  const order = nftSwap
    ? buildOrder(
        nftSwap,
        [myHalfOfOrder, theirHalfOfOrder],
        tradingPartner.goesFirstAddress,
        new Date(0),
        fakeSalt
      )
    : null;

  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const msLeftUntilTradeExpires = useMemo(() => {
    const expiryTimeString =
      tradingPartner.tradeStatus.type === "signedOrder"
        ? tradingPartner.tradeStatus.signedOrder.expirationTimeSeconds
        : typeof myOrderSent === "object"
        ? `${myOrderSent.expirationTimeSeconds}`
        : "";
    if (expiryTimeString === "") {
      return DEFAULT_TIME;
    }
    const expiryTime = Number.parseInt(expiryTimeString, 10);
    if (Number.isNaN(expiryTime)) {
      return DEFAULT_TIME;
    }

    return expiryTime * 1000 - time;
  }, [myOrderSent, tradingPartner.tradeStatus, time]);

  let tradeButtonStatus: TradeButtonStatus;
  if (myHalfOfOrder.items.length === 0 && theirHalfOfOrder.items.length === 0) {
    tradeButtonStatus = "waiting_for_offer";
  } else if (
    tradingPartner.goesFirstAddress !== address &&
    tradingPartner.goesFirstAddress !== tradingPartner.address
  ) {
    tradeButtonStatus = "waiting_for_fee_payment_selection";
  } else if (!bothPlayersAccepted) {
    // haven't checked lockin boxes, wait for those.
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
        msLeftUntilTradeExpires > 30 * 1000
      ) {
        // 2nd player needs to accept order
        tradeButtonStatus = "ready_to_sign";
      } else {
        // 2nd player needs to wait for signed order from 1st player
        tradeButtonStatus = "waiting_for_partner";
      }
    }
  }

  useEffect(() => {
    if (nftSwap && lockedIn.lockedIn && order) {
      if (tradingPartner.tradeStatus.type === "locked_in") {
        const partnerHash = tradingPartner.tradeStatus.orderHash;
        const hash = nftSwap.getOrderHash(order);
        if (partnerHash !== hash) {
          const err = `Got invalid hash from partner lockin\n: Expected ${hash}, got ${partnerHash}`;
          console.warn(err);
          setSoftWarning(err);
        }
      } else if (tradingPartner.tradeStatus.type === "signedOrder") {
        const expiryTime = Number.parseInt(
          tradingPartner.tradeStatus.signedOrder.expirationTimeSeconds,
          10
        );
        if (Number.isNaN(expiryTime)) {
          const error = `Trading partner's signed order expiry time is not a number: ${tradingPartner.tradeStatus.signedOrder.expirationTimeSeconds}`;
          console.error(error);
          setHardError({ error });
        }

        const partnerHash = nftSwap.getOrderHash({
          ...tradingPartner.tradeStatus.signedOrder,
          salt: fakeSalt,
          expirationTimeSeconds: zero.toString(),
        });
        const hash = nftSwap.getOrderHash(order);
        if (partnerHash !== hash) {
          const error = `Got invalid hash from partner submitting signed order\n: Expected ${hash}, got ${partnerHash}`;
          console.error(error);
          setHardError({ error });
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
    if (!order) {
      return;
    }
    if (!lockedIn.sent) {
      if (lockedIn.lockedIn) {
        p2p.send(tradingPartner.peer, {
          type: "lockin",
          lockedOrder: { hash: lockedIn.lockedIn.hash },
        });
        setLockedIn({
          ...lockedIn,
          sent: true,
        });
      } else {
        p2p.send(tradingPartner.peer, {
          type: "lockin",
          lockedOrder: false,
        });
        setLockedIn({
          ...lockedIn,
          sent: true,
        });
      }
    }
  }, [nftSwap, order, p2p, tradingPartner.peer, lockedIn]);

  useEffect(() => {
    if (myOrderSent && msLeftUntilTradeExpires < -30 * 1000) {
      setMyOrderSent(false);
      setLockedIn({ lockedIn: false, sent: false });
      p2p.send(tradingPartner.peer, {
        type: "offer",
        offer: [],
      });
    }
  }, [myOrderSent, msLeftUntilTradeExpires, p2p, tradingPartner.peer]);

  useEffect(() => {
    if (!nftSwap) {
      return;
    }
    async function invalidateDeadOrders() {
      if (!nftSwap) {
        return;
      }
      const deadOrders = (
        await Promise.all(
          signedOrderCache.map<
            Promise<{
              signedOrder: SignedOrder;
              orderInfo: OrderInfoStruct | false;
            }>
          >(({ signedOrder }) => {
            const timeLeft =
              Number.parseInt(signedOrder.expirationTimeSeconds, 10) * 1000 -
              Date.now();
            return timeLeft <= -30 * 1000
              ? Promise.resolve({ signedOrder, orderInfo: false })
              : nftSwap
                  .getOrderInfo(signedOrder)
                  .then((orderInfo) => ({ signedOrder, orderInfo }));
          })
        )
      )
        .filter(
          ({ orderInfo }) =>
            !orderInfo || orderInfo.orderStatus !== OrderStatus.Fillable
        )
        .map(({ signedOrder }) => signedOrder);

      if (deadOrders.length) {
        // Remove orders that are dead :)
        updateSignedOrderCache(
          signedOrderCache.filter(
            ({ signedOrder }) =>
              !deadOrders.some(
                (deadOrder) =>
                  nftSwap.getOrderHash(deadOrder) ===
                  nftSwap.getOrderHash(signedOrder)
              )
          )
        );
      }
    }
    invalidateDeadOrders();

    // Listen for existing orders to finish, show success if they do.
    const cancelWatchingOrders = signedOrderCache.map(
      ({ signedOrder, myItems, theirItems, chainID }) => {
        const { cancelListeners, orderFilled } = waitUntilOrderFilled(
          nftSwap,
          signedOrder
        );
        orderFilled.then((result) => {
          if (typeof result === "object") {
            setOrderSuccess({
              txHash: result.txHash,
              myItems,
              theirItems,
              chainID,
            });
          }
        });
        return cancelListeners;
      }
    );
    return () => cancelWatchingOrders.forEach((cancel) => cancel());
  }, [nftSwap, order, updateSignedOrderCache, signedOrderCache]);
  /*
   If Alice & Bob set up a trade, Alice signs the order and sends their signature to Bob, then Bob cancels in the vaportrade UI,
   If Alice signs another trade request for the same trade, it means Bob could submit both when Alice only intended to do the trade once.
   So, we cache orders, and don't re-sign the same order while one is open (not submitted on-chain and not expired).
  */
  // Load cached orders, and send it if it's a matching one
  useEffect(() => {
    if (
      nftSwap &&
      order &&
      bothPlayersAccepted &&
      !waitingForApproval &&
      tokensThatNeedApproval &&
      !tokensThatNeedApproval.length &&
      iGoFirst &&
      !myOrderSent
    ) {
      const matchingSignedOrder = signedOrderCache.find(
        ({ signedOrder }) =>
          nftSwap.getOrderHash({
            ...signedOrder,
            salt: fakeSalt,
            expirationTimeSeconds: zero.toString(),
          }) ===
          nftSwap.getOrderHash({
            ...order,
            salt: fakeSalt,
            expirationTimeSeconds: zero.toString(),
          })
      );
      if (matchingSignedOrder) {
        p2p.send(tradingPartner.peer, {
          type: "accept",
          order: matchingSignedOrder.signedOrder,
        });
        setMyOrderSent(matchingSignedOrder.signedOrder);
      }
    }
  }, [
    p2p,
    tradingPartner.peer,
    nftSwap,
    order,
    signedOrderCache,
    bothPlayersAccepted,
    iGoFirst,
    tokensThatNeedApproval,
    waitingForApproval,
    myOrderSent,
  ]);
  const addItemToTrade = useCallback(
    (item) => {
      if (item.type === "ERC721") {
        updateMyTradeOffer((items) => {
          const matchingItem = items.find(
            (i) =>
              i.contractAddress === item.contractAddress &&
              i.tokenID === item.tokenID
          );

          if (matchingItem) {
            items.splice(items.indexOf(matchingItem), 1);
          } else {
            items.push({ ...item });
          }
        });
      } else {
        setPickBalanceItem(item);
      }
    },
    [updateMyTradeOffer]
  );

  const fakeOrderHash = useMemo(
    () =>
      nftSwap &&
      order &&
      nftSwap.getOrderHash({
        ...order,
        salt: fakeSalt,
        expirationTimeSeconds: zero.toString(),
      }),
    [nftSwap, order]
  );
  const openOrdersThatArentThisOne = useMemo(
    () =>
      !nftSwap
        ? []
        : signedOrderCache.filter(
            (openOrder) =>
              openOrder.signedOrder.makerAddress.toLowerCase() ===
                address.toLowerCase() &&
              (!order ||
                nftSwap.getOrderHash({
                  ...openOrder.signedOrder,
                  salt: fakeSalt,
                  expirationTimeSeconds: zero.toString(),
                }) !== fakeOrderHash)
          ),
    [nftSwap, signedOrderCache, address, fakeOrderHash, order]
  );

  const chain = chainConfigs[tradingPartner.chainID];

  if (orderSuccess) {
    return (
      <div className="successfulTradeBox">
        <div className="oneSide">
          <TradeOffer items={orderSuccess.myItems} mine={true} />
          <div className="successLabel">You sent</div>
        </div>
        <div className="successfulTrade">
          <div className="successfulTitle">Trade completed</div>
          <p>Swap completed on {chainConfigs[orderSuccess.chainID].title}.</p>
          <SafeLink
            href={`${chainConfigs[orderSuccess.chainID].explorerUrl}/tx/${
              orderSuccess.txHash
            }`}
          >
            View on-chain transaction
          </SafeLink>
          <ButtonForm
            onClick={() => openWalletInfo(orderSuccess.chainID)}
            className="successWalletButton"
          >
            Open your wallet
          </ButtonForm>
          <img
            src={tradeButtonStates.ready_to_sign.icon}
            alt={"traded for"}
            className="successfulTradeIcon"
          />
          <p style={{ textAlign: "center" }}>
            If you enjoyed using vaportrade.net,
            <br />
            consider donating:
            <br />
            <ButtonIconSmall
              icon={tipIcon}
              hasBorder
              onClick={() => showTipUI()}
            />
          </p>
        </div>
        <div className="oneSide">
          <TradeOffer items={orderSuccess.theirItems} mine={false} />
          <div className="successLabel">You received</div>
        </div>
      </div>
    );
  }
  if (hardError) {
    return (
      <div className="errorContainer">
        <h1
          style={{
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          An error occured.
          <ButtonForm onClick={() => setHardError(null)}>
            Clear Error
          </ButtonForm>
        </h1>
        <SafeLink href="https://github.com/arilotter/vaportrade/discussions">
          Ask a question on the vaportrade support forums
        </SafeLink>
        <div className="error">{hardError.error}</div>
        {hardError.txHash ? (
          <div className="error">
            <SafeLink href={`${chain.explorerUrl}/tx/${hardError.txHash}`}>
              View on block explorer
            </SafeLink>
          </div>
        ) : null}
      </div>
    );
  }

  if (
    !isConnectorMultichain(connector) &&
    walletChainID !== tradingPartner.chainID
  ) {
    return (
      <div style={{ textAlign: "center" }}>
        <h1>Chain ID mismatch</h1>
        <div className="error">
          Your wallet's chain ID is set to{" "}
          {chainConfigs[(walletChainID || 0) as SupportedChain]?.title ??
            "an unknown chain"}{" "}
          ( Chain ID {walletChainID}),
          <br />
          but this trade is set to {chain.title} (Chain ID{" "}
          {tradingPartner.chainID}).
        </div>
        <p>
          Please change the active network in your wallet to {chain.title}{" "}
          (Chain ID {tradingPartner.chainID}).{" "}
          <ButtonForm
            onClick={() => {
              Promise.race([
                library.send("wallet_switchEthereumChain", [
                  { chainId: `0x${tradingPartner.chainID.toString(16)}` },
                ]),
                new Promise((res) => setTimeout(res, 10_000)),
              ]).catch((err) => {
                console.error(err);
                if (typeof err === "object" && (err as any).code === 4902) {
                  library
                    .send("wallet_addEthereumChain", [
                      {
                        chainId: `0x${tradingPartner.chainID.toString(16)}`,
                        chainName: chain.title,
                        blockExplorerUrls: [chain.explorerUrl],
                        rpcUrls: [chain.rpcUrl],
                      },
                    ])
                    .catch(() => {
                      setHardError({
                        error: `Failed to automatically add ${chain.title} (Chain ID 
                        ${tradingPartner.chainID}) to your wallet.`,
                      });
                    });
                } else {
                  setHardError({
                    error: `Failed to automatically switch your wallet's chain to ${chain.title} (Chain ID 
                  ${tradingPartner.chainID}).`,
                  });
                }
              });
            }}
          >
            Try Auto-Switch
          </ButtonForm>
        </p>
        <p>Or, change the chain this trade is set to occur on.</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Trade Chain:{" "}
          <ChainPicker
            setChain={updateChain}
            chain={tradingPartner.chainID}
            isDisabled={Boolean(lockedIn.lockedIn)}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-evenly",
        }}
      >
        <ButtonForm
          className="refreshButton"
          onClick={() => {
            setReloadNonce(reloadNonce + 1);
          }}
        >
          <div>
            <img src={reloadIcon} alt="Refresh" height={16} />
            Refresh Wallets
          </div>
        </ButtonForm>
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          Chain:{" "}
          <ChainPicker
            setChain={updateChain}
            chain={tradingPartner.chainID}
            isDisabled={Boolean(lockedIn.lockedIn)}
          />
        </div>
      </div>
      <div className="itemSections">
        <Tabs
          style={{ flex: "1" }}
          tabs={[
            {
              title: "My Wallet",
              contents: (
                <WalletContentsBox
                  chainID={tradingPartner.chainID}
                  accountAddress={address}
                  onItemSelected={addItemToTrade}
                  subtractItems={tradingPartner.myTradeOffer}
                  onItemDropped={(item) => {
                    updateMyTradeOffer((items) => {
                      const matchingItem = items.find(
                        (i) =>
                          i.contractAddress === item.contractAddress &&
                          i.tokenID === item.tokenID
                      );

                      if (matchingItem) {
                        items.splice(items.indexOf(matchingItem), 1);
                      }
                    });
                  }}
                  isInTrade
                  mine
                  reloadNonce={reloadNonce}
                />
              ),
            },
            {
              title: "Their Wallet",
              contents: (
                <WalletContentsBox
                  chainID={tradingPartner.chainID}
                  accountAddress={tradingPartner.address}
                  subtractItems={tradingPartner.tradeOffer}
                  mine={false}
                  isInTrade
                  reloadNonce={reloadNonce}
                />
              ),
            },
          ]}
        />
        {nftSwap && order ? (
          <div className="offers">
            <DetailsSection
              title={
                <>
                  <span
                    style={{
                      paddingRight: "16px",
                    }}
                  >
                    My trade offer
                  </span>
                  <Radio
                    name="myRadio"
                    id="myRadio"
                    isDisabled={Boolean(lockedIn.lockedIn)}
                    value={"clickme"}
                    onChange={() => updateGoesFirst(tradingPartner.address)}
                    checked={
                      tradingPartner.goesFirstAddress === tradingPartner.address
                    }
                  />
                  <label htmlFor="myRadio">I'll pay fees</label>
                </>
              }
            >
              <TradeOffer
                items={tradingPartner.myTradeOffer}
                onItemSelected={(item) => {
                  if (item.type === "ERC721") {
                    updateMyTradeOffer((items) => {
                      items.splice(items.indexOf(item), 1);
                    });
                  } else {
                    // change current balance :)
                    const diff = item.originalBalance.sub(item.balance);
                    setPickBalanceItem({ ...item, balance: diff });
                  }
                }}
                onItemDropped={addItemToTrade}
                onRemoveFromTrade={(item) => {
                  updateMyTradeOffer((items) => {
                    items.splice(items.indexOf(item), 1);
                  });
                }}
                mine
              />
            </DetailsSection>
            <section className="DetailsSection window__section acceptOffer">
              <div className="DetailsSection__title">
                <span className="acceptOfferText">
                  {tradeButtonStatus === "ready_to_sign" &&
                  tradingPartner.tradeStatus.type === "signedOrder"
                    ? `Submit trade (${formatTimeLeft(
                        msLeftUntilTradeExpires
                      )})`
                    : tradeButtonStatus === "waiting_for_partner" &&
                      typeof myOrderSent === "object"
                    ? `Waiting for order on-chain (${formatTimeLeft(
                        msLeftUntilTradeExpires
                      )})`
                    : tradeButtonStates[tradeButtonStatus].altText}
                </span>
              </div>

              <div className="acceptOfferContents">
                <Checkbox
                  isDisabled={
                    (tradingPartner.goesFirstAddress !== address &&
                      tradingPartner.goesFirstAddress !==
                        tradingPartner.address) ||
                    myOrderSent !== false ||
                    (tradingPartner.myTradeOffer.length === 0 &&
                      tradingPartner.tradeOffer.length === 0)
                  }
                  checked={Boolean(lockedIn.lockedIn)}
                  onChange={() => {
                    const newAcceptedState = !lockedIn.lockedIn;
                    setLockedIn({
                      sent: false,
                      lockedIn: newAcceptedState
                        ? { hash: nftSwap.getOrderHash(order) }
                        : false,
                    });
                  }}
                  id="myAccept"
                  label="Accept Offer"
                />
                <ButtonForm
                  isDisabled={!tradeButtonStates[tradeButtonStatus].enabled}
                  onClick={async () => {
                    // disable this button ? TODO
                    setSoftWarning(null);

                    if (tradeButtonStatus === "waiting_for_approvals") {
                      updateRequiredApprovals((approvals) => {
                        approvals.clear();
                      });
                      return;
                    }
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
                      setWalletIsOpen(true);
                      const approvalTxs = tokensThatNeedApproval
                        // 721s and 1155s only need one approval per contract
                        .filter(
                          (t) =>
                            (t.item.type !== "ERC721" &&
                              t.item.type !== "ERC1155") ||
                            t.key ===
                              tokensThatNeedApproval.find(
                                (firstTok) =>
                                  firstTok.item.contractAddress ===
                                  t.item.contractAddress
                              )?.key
                        )
                        .map(({ item }) =>
                          nftSwap
                            .approveTokenOrNftByAsset(
                              itemToSwapItem(item),
                              address
                            )
                            .then((tx) => nftSwap.awaitTransactionHash(tx.hash))
                        );
                      await Promise.allSettled(approvalTxs);
                      setWalletIsOpen(false);
                      // after we go thru all approval TXs, re-check approval status of each.
                      updateRequiredApprovals((approvals) => {
                        approvals.clear();
                      });
                    } else if (tradeButtonStatus === "ready_to_sign") {
                      // TODO status for signing in progress
                      if (iGoFirst) {
                        // sign and submit order to other player

                        // TODO remove this when Sequence adds Tolga's deploy warning UI
                        if (connector instanceof SequenceConnector) {
                          const isDeployed = await connector.configIsUpToDate(
                            tradingPartner.chainID,
                            address
                          );
                          if (!isDeployed) {
                            alert(
                              "Woah! You're using Sequence, but your wallet config hasn't been deployed on this chain yet. Make a transaction on this chain using Sequence or pay fees in this trade to make this work."
                            );
                            return;
                          }
                        }

                        console.log(
                          "[trade] waiting for user to sign order..."
                        );
                        const expiryTime =
                          Math.floor(new Date().getTime() / 1000) +
                          chain.tradingWindowSeconds;
                        try {
                          setWalletIsOpen(true);
                          const signedOrder = await nftSwap.signOrder(
                            {
                              ...order,

                              salt: BigNumber.from([
                                1,
                                2,
                                7,
                                3,
                                ...randomBytes(28),
                              ]).toString(), // get a real salt to sign this order
                              expirationTimeSeconds: BigNumber.from(
                                expiryTime
                              ).toString(), // and get a real timestamp of now + 5 minutes
                            },
                            address
                          );
                          setWalletIsOpen(false);
                          console.log(
                            "[trade] got signed order, sending to peer"
                          );
                          updateSignedOrderCache([
                            ...signedOrderCache,
                            {
                              signedOrder,
                              myItems: myHalfOfOrder.items,
                              theirItems: theirHalfOfOrder.items,
                              chainID: tradingPartner.chainID,
                            },
                          ]);

                          p2p?.send(tradingPartner.peer, {
                            type: "accept",
                            order: signedOrder,
                          });
                          console.log("[trade] waiting for peer to accept");
                          setMyOrderSent(signedOrder);
                          const orderFilled = await waitUntilOrderFilled(
                            nftSwap,
                            signedOrder
                          ).orderFilled;
                          if (typeof orderFilled === "object") {
                            setOrderSuccess({
                              txHash: orderFilled.txHash,
                              myItems: myHalfOfOrder.items,
                              theirItems: theirHalfOfOrder.items,
                              chainID: tradingPartner.chainID,
                            });
                          }
                        } catch (err) {
                          if (
                            err &&
                            typeof err === "object" &&
                            (err as any).code === 4001
                          ) {
                            setSoftWarning(
                              "You rejected the order signature.\nTry again and accept the signature request to continue."
                            );
                          } else {
                            setHardError({
                              error:
                                typeof err === "string"
                                  ? err
                                  : err instanceof Error
                                  ? `${err.name}\n${err.message}\n${err.stack}`
                                  : JSON.stringify(err),
                            });
                          }
                        } finally {
                          setWalletIsOpen(false);
                        }
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
                        try {
                          if (
                            chain.protocolFee &&
                            !chain.protocolFee.isZero()
                          ) {
                            const nativeTokenBalance = BigNumber.from(
                              await getEtherBalance(
                                tradingPartner.chainID,
                                address
                              )
                            );
                            if (nativeTokenBalance.lt(chain.protocolFee)) {
                              throw new Error(
                                `You can't afford the protocol fee on this chain! You need at least ${formatEther(
                                  chain.protocolFee
                                )}${
                                  chain.nativeTokenSymbol
                                } in your wallet, but you only have ${formatEther(
                                  nativeTokenBalance
                                )}${chain.nativeTokenSymbol}`
                              );
                            }
                          }
                          setWalletIsOpen(true);

                          const fillTx = await nftSwap.fillSignedOrder(
                            tradingPartner.tradeStatus.signedOrder,
                            undefined,
                            {
                              value: chain.protocolFee,
                            }
                          );
                          setMyOrderSent(
                            tradingPartner.tradeStatus.signedOrder
                          );
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
                              myItems: myHalfOfOrder.items,
                              theirItems: theirHalfOfOrder.items,
                              chainID: tradingPartner.chainID,
                            });
                          } else {
                            setHardError({
                              error: `Trade failed with error: Transaction ${fillTxReceipt.transactionHash} failed.`,
                              txHash: fillTxReceipt.transactionHash,
                            });
                          }
                        } catch (err) {
                          if (
                            err &&
                            typeof err === "object" &&
                            (err as any).code === 4001
                          ) {
                            setSoftWarning(
                              "You rejected submitting the trade on-chain.\nTry again and submit the order to complete the trade."
                            );
                          } else {
                            setHardError({
                              error:
                                typeof err === "string"
                                  ? err
                                  : err instanceof Error
                                  ? `${err.name}\n${err.message}\n${err.stack}`
                                  : JSON.stringify(err),
                            });
                          }
                        } finally {
                          setWalletIsOpen(false);
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
                <div className="acceptOfferSide">
                  <Checkbox
                    readOnly
                    checked={tradingPartner.tradeStatus.type !== "negotiating"}
                    id="partnerAccept"
                    label="They Accept"
                    isDisabled
                  />
                </div>
              </div>
              {unverifiedItems.length ? (
                <>
                  <div className="softWarning">
                    <p>
                      <strong>WARNING!</strong> There are unverified items in
                      their trade offer. Unless you know what you're doing,{" "}
                      <strong>you might be getting scammed.</strong>
                    </p>
                    <p>
                      Right-click these items in their trade offer and click
                      Properties for more info.
                    </p>
                    <ul>
                      {unverifiedItems.map((item) => (
                        <li key={getTokenKeyFromToken(item)}>{item.name}</li>
                      ))}
                    </ul>
                  </div>
                  {(tokensThatNeedApproval && tokensThatNeedApproval.length) ||
                  softWarning ||
                  openOrdersThatArentThisOne.length ? (
                    <hr />
                  ) : null}
                </>
              ) : null}
              {tokensThatNeedApproval && tokensThatNeedApproval.length ? (
                <>
                  <div className="softWarning">
                    After you lock in, vaportrade will ask you to approve
                    transferring:
                    <ul>
                      {tokensThatNeedApproval.map(({ item, key }) => (
                        <li key={key}>{item.name}</li>
                      ))}
                    </ul>
                  </div>
                  {softWarning || openOrdersThatArentThisOne.length ? (
                    <hr />
                  ) : null}
                </>
              ) : null}
              {softWarning ? (
                <>
                  <div className="softWarning">
                    {softWarning.split("\n").map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                  {openOrdersThatArentThisOne.length ? <hr /> : null}
                </>
              ) : null}
              {openOrdersThatArentThisOne.length ? (
                <>
                  <div className="softWarning">
                    <h3>Warning:</h3>
                    <p>
                      You have {openOrdersThatArentThisOne.length} open trade
                      {openOrdersThatArentThisOne.length > 1 ? "s" : ""} with
                      this address that they can complete until it expires!
                    </p>
                    <p>
                      You probably shouldn't sign another trade with them until{" "}
                      {openOrdersThatArentThisOne.length > 1
                        ? "they're "
                        : "it's "}
                      completed or expired.
                    </p>
                    <ul>
                      {openOrdersThatArentThisOne.map((order) => (
                        <li key={order.signedOrder.signature}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            (
                            {formatTimeLeft(
                              Number.parseInt(
                                order.signedOrder.expirationTimeSeconds,
                                10
                              ) *
                                1000 -
                                time
                            )}
                            ){" "}
                            <ButtonIconSmall
                              icon={cancelIcon}
                              onClick={async () => {
                                setWalletIsOpen(true);
                                try {
                                  await nftSwap.cancelOrder(order.signedOrder);
                                } finally {
                                  setWalletIsOpen(false);
                                }
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </section>
            <DetailsSection
              title={
                <>
                  <span style={{ paddingRight: "16px" }}>
                    Their trade offer
                  </span>
                  <Radio
                    name="theirRadio"
                    id="theirRadio"
                    isDisabled={Boolean(lockedIn.lockedIn)}
                    checked={tradingPartner.goesFirstAddress === address}
                    onChange={() => updateGoesFirst(address)}
                  />
                  <label htmlFor="theirRadio">They'll pay fees</label>
                </>
              }
            >
              <TradeOffer
                items={getItems({
                  balances: tradingPartner.tradeOffer,
                  contracts,
                  collectibles,
                }).filter(isItemWithKnownContractType)}
                mine={false}
              />
            </DetailsSection>
          </div>
        ) : null}
      </div>

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
          debug:
          <ButtonForm
            onClick={() =>
              setOrderSuccess({
                txHash: "dummytx",
                myItems: myHalfOfOrder.items,
                theirItems: theirHalfOfOrder.items,
                chainID: tradingPartner.chainID,
              })
            }
          >
            set success true
          </ButtonForm>
          <ButtonForm
            onClick={() => {
              updateRequiredApprovals((m) => m.clear());
            }}
          >
            reset token approvals
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
    enabled: true,
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
  waiting_for_offer: {
    icon: tradeIconDisabled,
    altText: "Waiting for a trade offer...",
    enabled: false,
  },
  waiting_for_fee_payment_selection: {
    icon: tradeIconDisabled,
    altText: "Waiting for you to decide who pays fees...",
    enabled: false,
  },
  waiting_for_partner: {
    icon: loadingIcon,
    altText: "Waiting for them...",
    enabled: false,
  },
};

const fakeSalt = formatBytes32String("vaportrade_fake_salt");
function waitUntilOrderFilled(
  nftSwap: NftSwap,
  signedOrder: SignedOrder
): {
  orderFilled: Promise<false | { txHash: string } | "cancelled">;
  cancelListeners: () => void;
} {
  const orderHash = nftSwap.getOrderHash(signedOrder);
  const fillEventFilter = nftSwap.exchangeContract.filters.Fill(
    null,
    null,
    null,
    null,
    null,
    null,
    orderHash
  );
  let fillEventCallback: TypedListener<FillEvent> | undefined;
  const waitFill = new Promise<{ txHash: string }>((res) => {
    fillEventCallback = (
      _a,
      _b,
      _c,
      _d,
      _e,
      _f,
      _g,
      _h,
      _i,
      _j,
      _k,
      _l,
      _m,
      _n,
      fillEvent
    ) => res({ txHash: fillEvent.transactionHash });
    nftSwap.exchangeContract.on(fillEventFilter, fillEventCallback);
  });
  let done = false;
  const orderFilled = Promise.race([
    waitFill,
    (async () => {
      while (!done) {
        const orderInfo = await nftSwap.getOrderInfo(signedOrder);
        if (
          orderInfo.orderStatus === OrderStatus.Fillable ||
          // if it's filled, the other promise will catch it.
          orderInfo.orderStatus === OrderStatus.FullyFilled
        ) {
          await new Promise((res) => setTimeout(res, 10000));
          continue;
        } else {
          // expired, bad order, etc
          done = true;
        }
      }
      return false as const;
    })(),
  ]);

  let cancel: () => void;
  const cancelled = new Promise<"cancelled">((res) => {
    cancel = () => res("cancelled");
  });
  const cancelListeners = () => {
    done = true;
    // Always true, but Typescript doesn't get that Promise callbacks run immediately.
    if (fillEventCallback) {
      nftSwap.exchangeContract.off(fillEventFilter, fillEventCallback);
    }
    cancel();
  };
  orderFilled.then(cancelListeners);

  return {
    orderFilled: Promise.race([cancelled, orderFilled]),
    cancelListeners,
  };
}
