import { useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { enableMapSet } from "immer";
import { Window, Theme } from "packard-belle";
import P2PT, { Peer } from "p2pt";

import { TrackersList } from "./components/TrackersList";
import { TradeUI } from "./components/tradeui/TradeUI";
import { FailableTracker, TRADE_REQUEST_MESSAGE } from "./utils/utils";

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
  const [peers, updatePeers] = useImmer<
    Set<{ peer: Peer; address: string | null; tradeRequest: boolean }>
  >(new Set());

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

  const client = useRef<P2PT | null>(null);

  useEffect(() => {
    if (!sources.length) {
      return;
    }
    const p2p = new P2PT([...sources], "vaportrade");

    // If a tracker connection was successful
    p2p.on("trackerconnect", (tracker, stats) => {
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
    });

    p2p.on("trackerwarning", (err, stats) => {
      const msg = err.toString();
      console.error(msg);
    });

    p2p.on("peerconnect", (peer) => {
      updatePeers((peers) => {
        peers.add({ peer, address: null, tradeRequest: false });
      });
      p2p.send(peer, address);
    });

    p2p.on("peerclose", (closedPeer) =>
      updatePeers((peers) => {
        for (const peer of peers) {
          if (peer.peer.id === closedPeer.id) {
            peers.delete(peer);
          }
        }
      })
    );

    p2p.on("msg", (peer, msg) => {
      if (typeof msg === "string" && msg.startsWith("0x")) {
        updatePeers((peers) => {
          const correctPeer = [...peers].find((p) => p.peer.id === peer.id);
          const incorrectPeers = [...peers].filter(
            (p) => p.address === msg && peer.id !== correctPeer?.peer.id
          );
          for (const peer of incorrectPeers) {
            peers.delete(peer);
          }
          if (!correctPeer) {
            return;
          }
          correctPeer.address = msg;
        });
      } else if (msg === TRADE_REQUEST_MESSAGE) {
        updatePeers((peers) => {
          const correctPeer = [...peers].find((p) => p.peer.id === peer.id);
          if (!correctPeer) {
            return;
          }
          correctPeer.tradeRequest = true;
        });
      }
    });

    p2p.start();
    client.current = p2p;
    return () => {
      client.current = null;
      p2p.destroy();
      updateTrackers((set) => {
        set.clear();
      });
      updatePeers((set) => {
        set.clear();
      });
    };
  }, [sources, updateTrackers, address, updatePeers]);

  const [showContacts, setShowContacts] = useState(false);
  const [showClippy, setShowClippy] = useState(false);

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
              <TradeUI
                wallet={wallet}
                indexer={indexer}
                metadata={metadata}
                tradeRequests={[...peers].filter((peer): peer is {
                  address: string;
                  peer: Peer;
                  tradeRequest: true;
                } => Boolean(peer.address && peer.tradeRequest))}
                p2pt={client.current}
              />
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
            const correctPeer = [...peers].find((p) => p.peer.id === peerId);
            if (correctPeer) {
              client.current?.send(correctPeer.peer, TRADE_REQUEST_MESSAGE);
              updatePeers((peers) => {
                const correctPeer = [...peers].find(
                  (p) => p.peer.id === peerId
                );
                if (correctPeer) {
                  correctPeer.tradeRequest = true;
                }
              });
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
