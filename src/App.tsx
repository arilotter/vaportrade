import { useCallback, useEffect, useMemo, useState } from "react";
import { useImmer } from "use-immer";
import { enableMapSet } from "immer";
import { Window, Theme, WindowAlert } from "packard-belle";
import P2PT, { Peer, Tracker } from "p2pt";

import { TrackersList } from "./components/TrackersList";
import { TradeUI } from "./components/tradeui/TradeUI";
import {
  FailableTracker,
  isTradingPeer,
  isVaportradeMessage,
  TradingPeer,
  VaportradeMessage,
} from "./utils/utils";

import logOutIcon from "./icons/logOut.png";
import helpIcon from "./icons/help.png";
import findPeersIcon from "./icons/findPeers.png";
import controlPanelIcon from "./icons/controlPanel.png";
import noIcon from "./icons/no.png";
import yesIcon from "./icons/yes.png";
import rebootIcon from "./icons/reboot.png";
import vtLogoIcon from "./icons/vticon.png";
import creditsIcon from "./icons/credits.png";
import tipIcon from "./icons/tip.png";
import backgroundImg from "./background.png";
import "./App.css";
import { EllipseAnimation } from "./utils/EllipseAnimation";
import { SequenceSessionProvider } from "./sequence/SequenceSessionProvider";
import { Clippy } from "./components/Clippy";
import { Contacts } from "./components/Contacts";
import { makeBlockyIcon } from "./makeBlockyIcon";
import { Chat } from "./Chat";
import { ControlPanel } from "./ControlPanel";
import { Credits } from "./Credits";
import { useWeb3React, Web3ReactProvider } from "@web3-react/core";
import { Web3Provider, ExternalProvider } from "@ethersproject/providers";
import { WalletSignin } from "./web3/WalletSignin";
import { NftSwap } from "@traderxyz/nft-swap-sdk";
import { connectorsByName, connectorsIconsByName } from "./web3/connectors";
import { TaskBar } from "./TaskBar";
import { WalletInfo } from "./WalletInfo";
import { SequenceMetaProvider } from "./SequenceMetaProvider";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TipUI } from "./TipUI";

enableMapSet();
function App() {
  return (
    <div
      style={{
        background: `url(${backgroundImg})`,
        backgroundSize: "50% auto",
        imageRendering: "pixelated",
        backgroundPosition: "50%",
        backgroundRepeat: "no-repeat",
        height: "100%",
      }}
    >
      <Theme className="container">
        <DndProvider backend={HTML5Backend}>
          <Web3ReactProvider getLibrary={getLibrary}>
            <WalletSignin>
              <Vaportrade />
            </WalletSignin>
          </Web3ReactProvider>
        </DndProvider>
      </Theme>
    </div>
  );
}

function getLibrary(provider: ExternalProvider) {
  return new Web3Provider(provider); // this will vary according to whether you use e.g. ethers or web3.js}
}

const defaultSources = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.files.fm:7073/announce",
  "wss://tracker.btorrent.xyz",
];

function Vaportrade() {
  const {
    account: address,
    library,
    deactivate,
    connector,
  } = useWeb3React<Web3Provider>();
  if (!address || !library) {
    throw new Error("Vaportrade created with no account!");
  }
  const [walletOpen, setWalletOpen] = useState(false);

  const [nftSwap, setNFTSwap] = useState<NftSwap | null>(null);
  const [trackers, updateTrackers] = useImmer<Set<FailableTracker>>(new Set());
  const [sources, updateSources] = useImmer<string[]>([]);
  const [peers, _updatePeers] = useImmer<Set<TradingPeer | Peer>>(new Set());

  // Hack because Immer types don't like things with Readonly in them, hehe
  const updatePeers = (_updatePeers as unknown) as (
    cb: (peers: Set<TradingPeer | Peer>) => void | Set<TradingPeer | Peer>
  ) => void;

  useEffect(() => {
    updateSources(defaultSources);
  }, [updateSources]);

  const [p2pClient, setP2pClient] = useState<P2PT<VaportradeMessage> | null>(
    null
  );
  useEffect(() => {
    if (p2pClient || !sources.length) {
      return;
    }
    const p2p = new P2PT([...sources], "vaportrade");

    p2p.start();
    setP2pClient(p2p);
  }, [p2pClient, sources]);

  useEffect(() => {
    const nftSwap = new NftSwap(library, library.getSigner(), 137);
    setNFTSwap(nftSwap);
  }, [library]);

  const [showClippy, setShowClippy] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  const [showTrackers, setShowTrackers] = useState<boolean | "minimized">(
    false
  );
  const [showControlPanel, setShowControlPanel] = useState<
    boolean | "minimized"
  >(false);
  const [showCredits, setShowCredits] = useState<boolean | "minimized">(false);
  const [tradingPartnerAddress, setTradingPartnerAddress] = useState<
    string | null
  >(null);
  const [showWalletInfo, setShowWalletInfo] = useState<boolean | "minimized">(
    false
  );
  const [showTipUI, setShowTipUI] = useState<boolean | "minimized">(false);
  const walletName = (Object.keys(connectorsByName) as Array<
    keyof typeof connectorsByName
  >).find((c) => connectorsByName[c] === connector)!;

  const walletIcon = connectorsIconsByName[walletName];

  const windows: Array<{
    isActive: boolean;
    minimize: () => void;
    open: () => void;
    icon: string;
    title: string;
    id: number;
  }> = useMemo(() => {
    const windows = [];
    if (showTrackers) {
      windows.push({
        isActive: showTrackers === true,
        icon: sources.length && trackers.size ? yesIcon : noIcon,
        title: "Peer Discovery",
        id: 1001,
        minimize: () => setShowTrackers("minimized"),
        open: () => setShowTrackers(true),
      });
    }
    if (showCredits) {
      windows.push({
        isActive: showCredits === true,
        icon: creditsIcon,
        title: "Credits",
        id: 1002,
        minimize: () => setShowCredits("minimized"),
        open: () => setShowCredits(true),
      });
    }
    if (showControlPanel) {
      windows.push({
        isActive: showControlPanel === true,
        icon: controlPanelIcon,
        title: "Control Panel",
        id: 1003,
        minimize: () => setShowControlPanel("minimized"),
        open: () => setShowControlPanel(true),
      });
    }
    if (showWalletInfo) {
      windows.push({
        isActive: showWalletInfo === true,
        icon: walletIcon,
        title: "My Wallet",
        id: 1004,
        minimize: () => setShowWalletInfo("minimized"),
        open: () => setShowWalletInfo(true),
      });
    }
    if (showTipUI) {
      windows.push({
        isActive: showTipUI === true,
        icon: tipIcon,
        title: "Donate",
        id: 1005,
        minimize: () => setShowTipUI("minimized"),
        open: () => setShowTipUI(true),
      });
    }
    return windows;
  }, [
    showControlPanel,
    showCredits,
    showTrackers,
    showWalletInfo,
    showTipUI,
    sources.length,
    trackers.size,
    walletIcon,
  ]);

  // P2P peer connection :)
  useEffect(() => {
    if (!sources.length) {
      return;
    }
    const p2p = p2pClient;
    if (!p2p) {
      return;
    }

    // If a tracker connection was successful
    const trackerConnect = (tracker: Tracker, stats: object) => {
      updateTrackers((trackers) => {
        if (!sources.some((src) => src === tracker.announceUrl)) {
          throw new Error(
            `Connected to tracker that wasn't in connection list!\nGot tracker ${
              tracker.announceUrl
            }, expecting one of ${[...sources].filter(
              (t) => typeof t === "string"
            )}`
          );
        }
        const existing = [...trackers].find(
          (t) => t.announceUrl === tracker.announceUrl
        );
        if (existing) {
          trackers.delete(existing);
        }
        trackers.add({ announceUrl: tracker.announceUrl, failed: false });
      });
    };
    p2p.on("trackerconnect", trackerConnect);

    const trackerWarning = (err: object, stats: object) => {
      const msg = err.toString();
      console.error(msg);
    };
    p2p.on("trackerwarning", trackerWarning);

    const peerConnect = (peer: Peer) => {
      updatePeers((peers) => {
        peers.add(peer);
      });
      p2p.send(peer, { type: "address", address });
    };
    p2p.on("peerconnect", peerConnect);

    const peerClose = (closedPeer: Peer) =>
      updatePeers((peers) => {
        for (const peer of peers) {
          const p = isTradingPeer(peer) ? peer.peer : peer;
          if (p.id === closedPeer.id) {
            peers.delete(peer);
            if (
              isTradingPeer(closedPeer) &&
              tradingPartnerAddress === closedPeer.address
            ) {
              setTradingPartnerAddress(null);
            }
          }
        }
      });
    p2p.on("peerclose", peerClose);

    const msg = (correctPeer: Peer, msg: any) => {
      if (isVaportradeMessage(msg)) {
        if (msg.type === "address") {
          updatePeers((peers) => {
            const incorrectPeers = [...peers].filter(
              (p) =>
                isTradingPeer(p) &&
                p.address === msg.address &&
                correctPeer.id !== p.peer.id
            );
            for (const peer of incorrectPeers) {
              peers.delete(peer);
            }

            if (msg.address === address) {
              // can't trade with yourself :P
              return;
            }
            peers.add({
              peer: correctPeer,
              address: msg.address,
              hasNewInfo: false,
              tradeRequest: false,
              tradeOffer: [],
              myTradeOffer: [],
              goesFirstAddress: "",
              tradeStatus: { type: "negotiating" },
              chat: [],
            });
          });
        } else {
          // Rest of the messages involve a trading peer
          updatePeers((peers) => {
            const tradingPeer = [...peers]
              .filter(isTradingPeer)
              .find((p) => p.peer.id === correctPeer.id);
            if (!tradingPeer) {
              return;
            }
            if (msg.type === "trade_request") {
              if (!tradingPeer.tradeRequest) {
                tradingPeer.hasNewInfo = true;
              }
              tradingPeer.tradeRequest = true;
            } else if (msg.type === "offer") {
              if (tradingPeer.tradeStatus.type === "signedOrder") {
                return; // ignore messages once we have a signed order
              }
              tradingPeer.tradeOffer = msg.offer;
              tradingPeer.tradeStatus = { type: "negotiating" };
              tradingPeer.hasNewInfo = true;
            } else if (msg.type === "lockin") {
              if (msg.lockedOrder) {
                if (tradingPeer.tradeStatus.type === "signedOrder") {
                  return; // ignore messages once we have a signed order
                }
                tradingPeer.tradeStatus = {
                  type: "locked_in",
                  orderHash: msg.lockedOrder.hash,
                };
              } else {
                tradingPeer.tradeStatus = { type: "negotiating" };
              }
            } else if (msg.type === "set_goes_first") {
              if (tradingPeer.tradeStatus.type === "signedOrder") {
                return; // ignore messages once we have a signed order
              }
              if (tradingPeer.tradeStatus.type !== "negotiating") {
                return;
              }
              tradingPeer.goesFirstAddress = msg.address;
            } else if (msg.type === "accept") {
              if (tradingPeer.tradeStatus.type === "signedOrder") {
                return; // ignore messages once we have a signed order
              }
              // todo verify hashse are the same as the order we locked into
              tradingPeer.tradeStatus = {
                type: "signedOrder",
                signedOrder: msg.order,
              };
            } else if (msg.type === "chat") {
              tradingPeer.chat.push({
                chatter: "them",
                message: msg.message,
              });
            }
          });
        }
      } else {
        console.warn("Got non-vaportrade message", msg);
      }
    };
    p2p.on("msg", msg);

    return () => {
      p2p.off("trackerconnect", trackerConnect);
      p2p.off("trackerwarning", trackerWarning);
      p2p.off("peerconnect", peerConnect);
      p2p.off("peerclose", peerClose);
      p2p.off("msg", msg);
    };
  }, [
    sources,
    updateTrackers,
    address,
    updatePeers,
    tradingPartnerAddress,
    p2pClient,
    setTradingPartnerAddress,
  ]);

  const tradeRequests = [...peers]
    .filter(isTradingPeer)
    .filter((p) => p.tradeRequest);

  const tradingPartner = tradeRequests.find(
    (p) => p.address === tradingPartnerAddress
  );
  // Throw warning if you try to leave with a trade open
  window.onbeforeunload = () => {
    if (tradingPartner) {
      return " ";
    }
  };

  const minimizeWindows = useCallback(() => {
    for (const w of windows) {
      w.minimize();
    }
    setTradingPartnerAddress(null);
  }, [windows]);

  return (
    <SequenceSessionProvider>
      {({ indexer, metadata }) => (
        <>
          <SequenceMetaProvider indexer={indexer} metadata={metadata}>
            {({ contracts, collectibles, requestTokensFetch, hardError }) =>
              hardError ? (
                <div className="modal">
                  <Window title="Error">
                    <p>Woah, vaportrade hit an error.</p>
                    <pre>{hardError}</pre>
                  </Window>
                </div>
              ) : (
                <>
                  {walletOpen ? (
                    <div className="modal darkenbg walletOpenDialog">
                      <WindowAlert
                        title="Waiting..."
                        icon={walletIcon}
                        onClose={() => setWalletOpen(false)}
                      >
                        Confirm in your {walletName} wallet
                      </WindowAlert>
                    </div>
                  ) : null}
                  <div className="modal">
                    {p2pClient && trackers.size && nftSwap && connector ? (
                      tradingPartner ? (
                        <Window
                          title={`Trading with ${tradingPartnerAddress}`}
                          icon={vtLogoIcon}
                          className="tradeWindow"
                          onMinimize={() => setTradingPartnerAddress(null)}
                          onClose={() => {
                            setTradingPartnerAddress(null);
                          }}
                        >
                          <div className="appWindowContents">
                            <TradeUI
                              setWalletOpen={setWalletOpen}
                              nftSwap={nftSwap}
                              indexer={indexer}
                              metadata={metadata}
                              collectibles={collectibles}
                              contracts={contracts}
                              p2p={p2pClient}
                              tradingPartner={tradingPartner}
                              requestTokensFetch={requestTokensFetch}
                              updateMyTradeOffer={(cb) => {
                                updatePeers((peers) => {
                                  const tp = [...peers]
                                    .filter(isTradingPeer)
                                    .find(
                                      (p) =>
                                        p.address === tradingPartner.address
                                    );
                                  if (tp) {
                                    cb(tp.myTradeOffer);
                                  }
                                });
                              }}
                              updateGoesFirst={(address) => {
                                updatePeers((peers) => {
                                  const tp = [...peers]
                                    .filter(isTradingPeer)
                                    .find(
                                      (p) =>
                                        p.address === tradingPartner.address
                                    );
                                  if (tp) {
                                    tp.goesFirstAddress = address;
                                  }
                                });
                              }}
                              onOpenWalletInfo={() => setShowWalletInfo(true)}
                              showTipUI={() => setShowTipUI(true)}
                            />
                            <Chat
                              messages={tradingPartner.chat}
                              onSendMessage={(message) => {
                                p2pClient?.send(tradingPartner.peer, {
                                  type: "chat",
                                  message,
                                });
                                updatePeers((peers) => {
                                  const correctPeer = [...peers]
                                    .filter(isTradingPeer)
                                    .find(
                                      (p) =>
                                        p.address === tradingPartner.address
                                    );
                                  if (correctPeer) {
                                    correctPeer.chat.push({
                                      chatter: "me",
                                      message,
                                    });
                                  }
                                });
                              }}
                            />
                          </div>
                        </Window>
                      ) : null
                    ) : (
                      <Window title="Connecting to trackers">
                        <div style={{ padding: "8px" }}>
                          Connecting to trackers
                          <EllipseAnimation />
                        </div>
                      </Window>
                    )}
                  </div>

                  {connector && showWalletInfo === true ? (
                    <WalletInfo
                      connector={connector}
                      disconnect={deactivate}
                      onClose={() => setShowWalletInfo(false)}
                      onMinimize={() => setShowWalletInfo("minimized")}
                      collectibles={collectibles}
                      contracts={contracts}
                      indexer={indexer}
                      requestTokensFetch={requestTokensFetch}
                    />
                  ) : null}
                </>
              )
            }
          </SequenceMetaProvider>

          {showTrackers === true ? (
            <TrackersList
              sources={sources}
              trackers={trackers}
              onClose={() => setShowTrackers(false)}
              onMinimize={() => setShowTrackers("minimized")}
            />
          ) : null}

          {showControlPanel === true ? (
            <ControlPanel
              onClose={() => setShowControlPanel(false)}
              onMinimize={() => setShowControlPanel("minimized")}
            />
          ) : null}

          {showCredits === true ? (
            <Credits
              onClose={() => setShowCredits(false)}
              onMinimize={() => setShowCredits("minimized")}
            />
          ) : null}

          {showTipUI === true ? (
            <TipUI
              onClose={() => setShowTipUI(false)}
              onMinimize={() => setShowTipUI("minimized")}
            />
          ) : null}

          {showContacts ? (
            <Contacts
              requestMorePeers={() => p2pClient?.requestMorePeers()}
              onClose={() => setShowContacts(false)}
              options={[...peers]
                .filter(isTradingPeer)
                .map((peer) => peer.address)
                .filter(([peerAddr]) => address !== peerAddr)
                .map((peerAddr) => ({
                  title: peerAddr,
                  value: peerAddr,
                  alt: `Wallet Address ${peerAddr}`,
                  icon: makeBlockyIcon(peerAddr),
                }))}
              onSubmit={(peerAddr) => {
                const correctPeer = [...peers]
                  .filter(isTradingPeer)
                  .find((p) => p.address === peerAddr);
                if (correctPeer) {
                  p2pClient?.send(correctPeer.peer, { type: "trade_request" });
                  updatePeers((peers) => {
                    const correctPeer = [...peers]
                      .filter(isTradingPeer)
                      .find((p) => p.address === peerAddr);
                    if (correctPeer) {
                      correctPeer.tradeRequest = true;
                    }
                  });

                  for (const w of windows) {
                    w.minimize();
                  }
                  setTradingPartnerAddress(correctPeer.address);
                }
                setShowContacts(false);
              }}
            />
          ) : null}

          {showClippy && (
            <Clippy
              message={
                tradeRequests.length
                  ? "Double-click items to add them to your trade offer!"
                  : !showContacts
                  ? "Click Start → Find People to Trade With to get started!"
                  : "Pick someone online to trade with!"
              }
              onOutOfMessages={() => setShowClippy(false)}
            />
          )}

          <TaskBar
            openWindows={[
              ...tradeRequests.map((trader, id) => ({
                isAlerting:
                  trader.hasNewInfo && trader.address !== tradingPartnerAddress,
                title: trader.address,
                icon: makeBlockyIcon(trader.address),
                isActive: trader.address === tradingPartnerAddress,
                onClick: () => {
                  updatePeers((peers) => {
                    for (const peer of peers) {
                      if (
                        isTradingPeer(peer) &&
                        peer.address === trader.address
                      ) {
                        peer.hasNewInfo = false;
                      }
                    }
                  });
                  setTradingPartnerAddress(
                    trader.address === tradingPartnerAddress
                      ? null
                      : trader.address
                  );
                  for (const w of windows) {
                    w.minimize();
                  }
                },
                id,
              })),
              ...windows.map((win) => ({
                ...win,
                isAlerting: false,
                onClick: () => {
                  if (win.isActive) {
                    win.minimize();
                  } else {
                    win.open();
                    setTradingPartnerAddress(null);
                    for (const w of windows) {
                      if (w.id !== win.id) {
                        w.minimize();
                      }
                    }
                  }
                },
              })),
            ]}
            options={[
              [
                {
                  title: "Find People to Trade With",
                  icon: findPeersIcon,
                  onClick: () => setShowContacts(true),
                },
              ],
              [
                {
                  title: "Credits",
                  icon: creditsIcon,
                  onClick: () => {
                    minimizeWindows();
                    setShowCredits(true);
                  },
                },
                {
                  title: "Help",
                  icon: helpIcon,
                  onClick: () => {
                    setShowClippy(true);
                  },
                },
                {
                  title: "Donate",
                  icon: tipIcon,
                  onClick: () => {
                    setShowTipUI(true);
                  },
                },
                {
                  onClick: () => {},
                  title: "Settings",
                  icon: controlPanelIcon,
                  options: [
                    {
                      onClick: () => {
                        minimizeWindows();
                        setShowControlPanel(true);
                      },
                      title: "Control Panel",
                      icon: controlPanelIcon,
                    },
                    {
                      icon: yesIcon,
                      title: "Peer Discovery",
                      onClick: () => {
                        minimizeWindows();
                        setShowTrackers(true);
                      },
                    },
                  ],
                },
                {
                  icon: walletIcon,
                  title: `My Wallet`,
                  onClick: () => {
                    minimizeWindows();
                    setShowWalletInfo(true);
                  },
                },
              ],
              {
                onClick: () => window.location.reload(),
                title: "Reboot",
                icon: rebootIcon,
              },
              {
                onClick: deactivate,
                title: "Disconnect Wallet",
                icon: logOutIcon,
              },
            ]}
            notifiers={[
              {
                alt: sources.length
                  ? `Connected to ${trackers.size}/${sources.length} trackers`
                  : "Loading Trackers...",
                onClick: () => {
                  minimizeWindows();
                  setShowTrackers(true);
                },
                icon: sources.length && trackers.size ? yesIcon : noIcon,
              },
              {
                alt: `Connected to wallet ${address}`,
                onClick: () => {
                  minimizeWindows();
                  setShowWalletInfo(true);
                },
                icon: makeBlockyIcon(address),
              },
              {
                alt: `Wallet type: ${walletName}`,
                onClick: () => {
                  minimizeWindows();
                  setShowWalletInfo(true);
                },
                icon: walletIcon,
              },
            ]}
          />
        </>
      )}
    </SequenceSessionProvider>
  );
}

export default App;
