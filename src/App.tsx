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

import logo from "./vtlogo.png";
import clouds from "./clouds.png";
import "./App.css";
import { ConnectToSequence } from "./sequence/ConnectToSequence";
import { sequence } from "0xsequence";
import { EllipseAnimation } from "./utils/EllipseAnimation";
import { SequenceSessionProvider } from "./sequence/SequenceSessionProvider";
import { ProfileIcon } from "./components/ProfileIcon";
import { FindProfileIcon } from "./components/FindProfileIcon";
import { Clippy } from "./components/Clippy";
import { Contacts } from "./components/Contacts";
import { makeBlockyIcon } from "./makeBlockyIcon";
import { TradeRequestPopup } from "./TradeRequest";
import { Chat } from "./Chat";

enableMapSet();

function App() {
  return (
    <div
      style={{
        background: `url(${clouds})`,
        backgroundSize: "cover",
        imageRendering: "pixelated",
        height: "100%",
      }}
    >
      <Theme className="container">
        <ConnectToSequence>
          {({ wallet, address, disconnect }) => (
            <Vaportrade
              wallet={wallet}
              address={address}
              disconnect={disconnect}
            />
          )}
        </ConnectToSequence>
      </Theme>
    </div>
  );
}

const defaultSources = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.files.fm:7073/announce",
  "wss://tracker.btorrent.xyz",
];

function Vaportrade({
  wallet,
  address,
  disconnect,
}: {
  wallet: sequence.Wallet;
  address: string;
  disconnect: () => void;
}) {
  const [trackers, updateTrackers] = useImmer<Set<FailableTracker>>(new Set());
  const [sources, updateSources] = useImmer<string[]>([]);
  const [peers, updatePeers] = useImmer<Set<TradingPeer | Peer>>(new Set());

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

  const [showContacts, setShowContacts] = useState(false);
  const [showClippy, setShowClippy] = useState(false);

  const [tradingPartner, updateTradingPartner] = useImmer<TradingPeer | null>(
    null
  );
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
            if (tradingPartner?.peer.id === closedPeer.id) {
              updateTradingPartner(null);
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
            peers.add({
              peer: correctPeer,
              address: msg.address,
              hasNewInfo: false,
              tradeRequest: false,
              tradeOffer: [],
              offerAccepted: false,
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
              tradingPeer.tradeOffer = msg.offer;
              tradingPeer.offerAccepted = false;
              tradingPeer.hasNewInfo = true;
            } else if (msg.type === "lockin") {
              tradingPeer.offerAccepted = msg.isLocked;
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
    tradingPartner,
    p2pClient,
    updateTradingPartner,
  ]);

  // Update trading partner info when its associated peer updates
  useEffect(() => {
    const partner = [...peers]
      .filter(isTradingPeer)
      .find((p) => p.address === tradingPartner?.address);
    if (partner) {
      updateTradingPartner(partner);
    }
  }, [updateTradingPartner, peers, tradingPartner?.address]);

  const tradeRequests = [...peers]
    .filter(isTradingPeer)
    .filter((p) => p.tradeRequest);

  return (
    <>
      <header>
        <ProfileIcon seed={address} />
        <img
          src={logo}
          alt="vaportrade logo: a letter V with a letter T superimposed on top of the right stroke of the V"
          className="logo"
        />
        <FindProfileIcon onClick={() => setShowContacts(true)} />
      </header>
      <Window
        title={`vaportrade: Wallet ${address}`}
        icon={logo}
        resizable={false}
        className="window"
        onClose={disconnect}
        onHelp={() => setShowClippy(true)}
      >
        <TrackersList sources={sources} trackers={trackers} />
        <SequenceSessionProvider wallet={wallet}>
          {({ indexer, metadata }) =>
            trackers.size ? (
              <div className="appWindowContents">
                <div>
                  {tradeRequests.map((trader) => (
                    <TradeRequestPopup
                      flash={
                        trader.address !== tradingPartner?.address &&
                        trader.hasNewInfo
                      }
                      key={trader.address}
                      address={trader.address!}
                      isActive={trader.address === tradingPartner?.address}
                      onClick={() => {
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
                        updateTradingPartner(trader);
                      }}
                    />
                  ))}
                </div>
                <TradeUI
                  wallet={wallet}
                  indexer={indexer}
                  metadata={metadata}
                  p2p={p2pClient}
                  tradingPartner={tradingPartner}
                />
                {tradingPartner ? (
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
                ) : null}
              </div>
            ) : (
              <div style={{ padding: "8px" }}>
                Connecting to trackers
                <EllipseAnimation />
              </div>
            )
          }
        </SequenceSessionProvider>
      </Window>
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
              updateTradingPartner(correctPeer);
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
              ? "Click the plus button in the top right to find a trading partner!"
              : "Pick someone online to trade with!"
          }
          onOutOfMessages={() => setShowClippy(false)}
        />
      )}
    </>
  );
}

export default App;
