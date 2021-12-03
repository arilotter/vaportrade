import { useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { enableMapSet } from "immer";
import { Window, Theme } from "packard-belle";
import P2PT, { Peer, Tracker } from "p2pt";

import { TrackersList } from "./components/TrackersList";
import { TradeUI } from "./components/tradeui/TradeUI";
import {
  FailableTracker,
  isTradingPeer,
  TRADE_REQUEST_MESSAGE,
  TradingPeer,
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

enableMapSet();

function App() {
  return (
    <div
      style={{
        background: `url(${clouds})`,
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
    // fetch(
    //   "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all_ws.txt"
    // )
    //   .then((r) => r.text())
    Promise.resolve(
      `wss://tracker.files.fm:7073/announce
      wss://spacetradersapi-chatbox.herokuapp.com:443/announce
      wss://peertube.cpy.re:443/tracker/socket
      ws://tracker.files.fm:7072/announce`
    ).then((sourcesString) =>
      updateSources(() =>
        sourcesString
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length)
      )
    );
  }, [updateSources]);

  const [p2pClient, setP2pClient] = useState<P2PT | null>(null);
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

  const [tradingPartner, setTradingPartner] = useState<TradingPeer | null>(
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
      p2p.send(peer, address);
    };
    p2p.on("peerconnect", peerConnect);

    const peerClose = (closedPeer: Peer) =>
      updatePeers((peers) => {
        for (const peer of peers) {
          const p = isTradingPeer(peer) ? peer.peer : peer;
          if (p.id === closedPeer.id) {
            peers.delete(peer);
            if (tradingPartner?.peer.id === closedPeer.id) {
              setTradingPartner(null);
            }
          }
        }
      });
    p2p.on("peerclose", peerClose);

    const msg = (correctPeer: Peer, msg: any) => {
      if (typeof msg === "string" && msg.startsWith("0x")) {
        updatePeers((peers) => {
          const incorrectPeers = [...peers].filter(
            (p) =>
              isTradingPeer(p) &&
              p.address === msg &&
              correctPeer.id !== p.peer.id
          );
          for (const peer of incorrectPeers) {
            peers.delete(peer);
            console.log("deleting peer");
          }
          peers.add({
            peer: correctPeer,
            address: msg,
            hasNewInfo: false,
            tradeRequest: false,
          });
        });
      } else if (msg === TRADE_REQUEST_MESSAGE) {
        updatePeers((peers) => {
          const tradingPeer = [...peers]
            .filter(isTradingPeer)
            .find((p) => p.peer.id === correctPeer.id);
          if (!tradingPeer) {
            return;
          }
          tradingPeer.tradeRequest = true;
          tradingPeer.hasNewInfo = true;
        });
      }
    };
    p2p.on("msg", msg);

    return () => {
      p2p.off("trackerconnect", trackerConnect);
      p2p.off("trackerwarning", trackerWarning);
      p2p.off("peerconnect", peerConnect);
      p2p.off("peerclose", peerClose);
    };
  }, [
    sources,
    updateTrackers,
    address,
    updatePeers,
    tradingPartner,
    p2pClient,
  ]);

  const tradeRequests = [...peers]
    .filter(isTradingPeer)
    .filter((p) => p.tradeRequest);

  return (
    <>
      <header>
        <ProfileIcon seed={address} />
        <img src={logo} alt="Vaportrade Logo" className="logo" />
        <FindProfileIcon onClick={() => setShowContacts(true)} />
      </header>
      <Window
        title={`Vaportrade: Wallet ${address}`}
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
              <div>
                <div>
                  {tradeRequests.map((trader) => (
                    <TradeRequestPopup
                      flash={trader.hasNewInfo}
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
                        setTradingPartner(trader);
                      }}
                    />
                  ))}
                </div>
                <TradeUI
                  wallet={wallet}
                  indexer={indexer}
                  metadata={metadata}
                  p2pt={p2pClient}
                  tradingPartner={tradingPartner}
                />
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
          onClose={() => setShowContacts(false)}
          options={[...peers]
            .filter(isTradingPeer)
            .map((peer) => [peer.peer.id, peer.address] as const)
            .filter((x: any): x is [string, string] => typeof x[1] === "string")
            .filter(([_, peerAddr]) => address !== peerAddr)
            .map(([peerId, peerAddr]) => ({
              title: peerAddr,
              value: peerId,
              alt: `Wallet Address ${peerAddr}`,
              icon: makeBlockyIcon(peerAddr),
            }))}
          onSubmit={(peerId) => {
            const correctPeer = [...peers]
              .filter(isTradingPeer)
              .find((p) => p.peer.id === peerId);
            if (correctPeer) {
              p2pClient?.send(correctPeer.peer, TRADE_REQUEST_MESSAGE);
              updatePeers((peers) => {
                const correctPeer = [...peers]
                  .filter(isTradingPeer)
                  .find((p) => p.peer.id === peerId);
                if (correctPeer) {
                  correctPeer.tradeRequest = true;
                }
              });
              setTradingPartner(correctPeer);
            }
            setShowContacts(false);
          }}
        />
      ) : null}
      {showClippy && (
        <Clippy
          message={
            showContacts
              ? "Pick someone online to trade with!"
              : "Click the plus button in the top right to find a trading partner!"
          }
          onOutOfMessages={() => setShowClippy(false)}
        />
      )}
    </>
  );
}

export default App;
