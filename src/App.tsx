import { useEffect, useState } from "react";
import { useImmer } from "use-immer";
import { enableMapSet } from "immer";
import { Window, Theme } from "packard-belle";
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
        <Web3ReactProvider getLibrary={getLibrary}>
          <WalletSignin>
            <Vaportrade />
          </WalletSignin>
        </Web3ReactProvider>
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
  const [nftSwap, setNFTSwap] = useState<NftSwap | null>(null);
  const [trackers, updateTrackers] = useImmer<Set<FailableTracker>>(new Set());
  const [sources, updateSources] = useImmer<string[]>([]);
  const [peers, _updatePeers] = useImmer<Set<TradingPeer | Peer>>(new Set());

  // Hack because Immer types don't like things with Readonly in them, hehe
  const updatePeers = (_updatePeers as unknown) as (
    cb: (peers: Set<TradingPeer | Peer>) => void | Set<TradingPeer | Peer>
  ) => void;

  // When you close a trading window, don't let them show up again until you send *them* a request.
  const [tempBannedAddresses, updateTempBannedAddresses] = useImmer<
    Set<string>
  >(new Set());

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

  const [showContacts, setShowContacts] = useState(false);
  const [showTrackers, setShowTrackers] = useState(false);
  const [showClippy, setShowClippy] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const [tradingPartnerAddress, updateTradingPartnerAddress] = useImmer<
    string | null
  >(null);
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
              updateTradingPartnerAddress(null);
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
              tradeStatus: { type: "negotiating" },
              chat: [],
              myTradeOffer: [],
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
              if (tradingPeer.tradeStatus.type === "signedOrder") {
                return; // ignore messages once we have a signed order
              }
              if (msg.lockedOrder) {
                tradingPeer.tradeStatus = {
                  type: "locked_in",
                  orderHash: msg.lockedOrder.hash,
                };
              } else {
                tradingPeer.tradeStatus = { type: "negotiating" };
              }
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
    updateTradingPartnerAddress,
  ]);

  const tradeRequests = [...peers]
    .filter(isTradingPeer)
    .filter((p) => p.tradeRequest && !tempBannedAddresses.has(p.address));

  const tradingPartner = tradeRequests.find(
    (p) => p.address === tradingPartnerAddress
  );
  // Throw warning if you try to leave with a trade open
  window.onbeforeunload = () => {
    if (tradingPartner) {
      return " ";
    }
  };
  return (
    <>
      <SequenceSessionProvider>
        {({ indexer, metadata }) => (
          <div className="modal">
            {p2pClient && trackers.size && nftSwap ? (
              tradingPartner ? (
                <Window
                  title={`Trading with ${tradingPartnerAddress}`}
                  icon={vtLogoIcon}
                  className="window"
                  onMinimize={() => updateTradingPartnerAddress(null)}
                  onClose={() => {
                    updateTradingPartnerAddress(null);
                    updateTempBannedAddresses((addrs) => {
                      addrs.add(tradingPartner.address);
                    });
                  }}
                >
                  <div className="appWindowContents">
                    <TradeUI
                      nftSwap={nftSwap}
                      indexer={indexer}
                      metadata={metadata}
                      p2p={p2pClient}
                      tradingPartner={tradingPartner}
                      updateMyTradeOffer={(cb) => {
                        updatePeers((peers) => {
                          const tp = [...peers]
                            .filter(isTradingPeer)
                            .find((p) => p.address === tradingPartner.address);
                          if (tp) {
                            cb(tp.myTradeOffer);
                          }
                        });
                      }}
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
                            .find((p) => p.address === tradingPartner.address);
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
        )}
      </SequenceSessionProvider>

      {showTrackers ? (
        <TrackersList
          sources={sources}
          trackers={trackers}
          onClose={() => setShowTrackers(false)}
        />
      ) : null}

      {showControlPanel ? (
        <ControlPanel onClose={() => setShowControlPanel(false)} />
      ) : null}

      {showCredits ? <Credits onClose={() => setShowCredits(false)} /> : null}

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
            updateTempBannedAddresses((addrs) => {
              addrs.delete(peerAddr);
            });
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
              updateTradingPartnerAddress(correctPeer.address);
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
              ? "Click 'Start → Find People to Trade With' to get started!"
              : "Pick someone online to trade with!"
          }
          onOutOfMessages={() => setShowClippy(false)}
        />
      )}

      <TaskBar
        openWindows={tradeRequests.map((trader, id) => ({
          isAlerting:
            trader.hasNewInfo && trader.address !== tradingPartnerAddress,
          title: trader.address,
          icon: makeBlockyIcon(trader.address),
          isActive: trader.address === tradingPartnerAddress,
          onClick: () => {
            updatePeers((peers) => {
              for (const peer of peers) {
                if (isTradingPeer(peer) && peer.address === trader.address) {
                  peer.hasNewInfo = false;
                }
              }
            });
            updateTradingPartnerAddress(
              trader.address === tradingPartnerAddress ? null : trader.address
            );
          },
          id,
        }))}
        options={[
          [
            {
              onClick: () => setShowContacts(true),
              title: "Find People to Trade With",
              icon: findPeersIcon,
            },
          ],
          [
            {
              title: "Credits",
              icon: creditsIcon,
              onClick: () => setShowCredits(true),
            },
            {
              title: "Help",
              icon: helpIcon,
              onClick: () => setShowClippy(true),
            },
            {
              onClick: () => setShowControlPanel(true),
              title: "Control Panel",
              icon: controlPanelIcon,
            },
          ],
          // {
          //   onClick: () => library.openWallet(undefined, undefined, chainId),
          //   title: "Open Wallet",
          //   icon: sequenceLogo,
          // },
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
            onClick: () => setShowTrackers(true),
            icon: sources.length && trackers.size ? yesIcon : noIcon,
          },
          {
            alt: `Connected to wallet ${address}`,
            onClick: () => {},
            icon: makeBlockyIcon(address),
          },
          ...(connector
            ? [
                (() => {
                  const name = (Object.keys(connectorsByName) as Array<
                    keyof typeof connectorsByName
                  >).find((c) => connectorsByName[c] === connector)!;

                  const icon = connectorsIconsByName[name];
                  return {
                    alt: `Wallet type: ${name}`,
                    onClick: () => {},
                    icon: icon,
                  };
                })(),
              ]
            : []),
        ]}
      />
    </>
  );
}

export default App;
