import { useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { enableMapSet } from "immer";
import { Window, Theme } from "packard-belle";
import P2PT from "p2pt";

import { TrackersList } from "./components/TrackersList";
import { TradeUI } from "./components/tradeui/TradeUI";
import { FailableTracker } from "./utils/types";

import logo from "./vtlogo.png";
import clouds from "./clouds.png";
import "./App.css";
import { ConnectToSequence } from "./sequence/ConnectToSequence";
import { sequence } from "0xsequence";
import { EllipseAnimation } from "./utils/EllipseAnimation";
import { SequenceIndexerProvider } from "./sequence/SequenceIndexerProvider";
import { ProfileIcon } from "./components/ProfileIcon";
import { FindProfileIcon } from "./components/FindProfileIcon";
import { Clippy } from "./components/Clippy";
import { Contacts } from "./components/Contacts";

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
    const p2p = new P2PT([...sources.values()], "vaportrade");

    // If a tracker connection was successful
    p2p.on("trackerconnect", (tracker, stats) => {
      updateTrackers((trackers) => {
        if (!sources.some((src) => src === tracker.announceUrl)) {
          throw new Error(
            `Connected to tracker that wasn't in connection list!\nGot tracker ${
              tracker.announceUrl
            }, expecting one of ${[...sources.values()].filter(
              (t) => typeof t === "string"
            )}`
          );
        }
        const existing = [...trackers.values()].find(
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

    // If a new peer, send message
    p2p.on("peerconnect", (peer) => {
      p2p
        .send(peer, "Hi")
        .then(([peer, msg]) => {
          console.log("Got response : " + msg);
          return peer.respond("Bye");
        })
        .then(([peer, msg]) => {
          console.log("Got response2 : " + msg);
        });
    });

    // If message received from peer
    p2p.on("msg", (peer, msg) => {
      console.log(`Got message from ${peer.id} : ${msg}`);
      if (msg === "Hi") {
        peer.respond("Hello !").then(([peer, msg]) => {
          peer.respond("Bye !");
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
    };
  }, [sources, updateTrackers]);

  const [showContacts, setShowContacts] = useState(false);

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
      >
        <TrackersList sources={sources} trackers={trackers} />
        <SequenceIndexerProvider wallet={wallet}>
          {({ indexer }) =>
            trackers.size ? (
              <TradeUI wallet={wallet} indexer={indexer} />
            ) : (
              <div style={{ padding: "8px" }}>
                Connecting to trackers
                <EllipseAnimation />
              </div>
            )
          }
        </SequenceIndexerProvider>
      </Window>
      {showContacts ? (
        <Contacts wallet={wallet} onClose={() => setShowContacts(false)} />
      ) : null}
      <Clippy
        message={
          showContacts
            ? "Pick someone online to trade with!"
            : "Click the plus button in the top right to find a trading partner!"
        }
      />
    </>
  );
}

export default App;
