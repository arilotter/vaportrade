import { ChainId } from "@0xsequence/network";
import { JsonRpcProvider } from "@ethersproject/providers";
import {
  connectorsForWallets,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { enableMapSet } from "immer";
import P2PT, { Peer, Tracker } from "p2pt";
import {
  ButtonForm,
  StandardMenu,
  Theme,
  Window,
  WindowAlert,
} from "packard-belle";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useImmer } from "use-immer";
import { useAccount, WagmiProvider } from "wagmi";
import "./App.css";
import backgroundImg from "./background.png";
import { Chat } from "./Chat";
import { Clippy } from "./components/Clippy";
import { Contacts } from "./components/Contacts";
import { TrackersList } from "./components/TrackersList";
import missingIcon from "./components/tradeui/missing.png";
import { Properties, PropertiesProps } from "./components/tradeui/Properties";
import { TradeUI } from "./components/tradeui/TradeUI";
import { ControlPanel } from "./ControlPanel";
import { Credits } from "./Credits";
import controlPanelIcon from "./icons/controlPanel.png";
import creditsIcon from "./icons/credits.png";
import findPeersIcon from "./icons/findPeers.png";
import helpIcon from "./icons/help.png";
import logOutIcon from "./icons/logOut.png";
import noIcon from "./icons/no.png";
import rebootIcon from "./icons/reboot.png";
import tipIcon from "./icons/tip.png";
import yesIcon from "./icons/yes.png";

import { makeBlockyIcon } from "./makeBlockyIcon";
import { SequenceSessionProvider } from "./sequence/SequenceSessionProvider";
import { IndexerContext, SequenceMetaProvider } from "./SequenceMetaProvider";
import { config } from "./settings";
import { TaskBar } from "./TaskBar";
import testnetBackgroundImg from "./testnetBackground.png";
import { TipUI } from "./TipUI";
import {
  Menu,
  PropertiesContext,
  RightClickMenuContext,
} from "./utils/context";
import { EllipseAnimation } from "./utils/EllipseAnimation";
import { chainConfigs, SupportedChain } from "./utils/multichain";
import { SafeLink } from "./utils/SafeLink";
import {
  FailableTracker,
  isTradingPeer,
  isVaportradeMessage,
  normalizeAddress,
  TradingPeer,
  VaportradeMessage,
} from "./utils/utils";
import { WalletInfo } from "./WalletInfo";
import { walletGroups, wallets } from "./web3/wallets";
import { WalletSignin } from "./web3/WalletSignin";

enableMapSet();

const connectors = connectorsForWallets(walletGroups);

const provider = ({ chainId }: { chainId?: number }) =>
  new JsonRpcProvider(
    (
      (chainId && chainConfigs[chainId as SupportedChain]) ||
      chainConfigs[1]
    ).rpcUrl
  );

function App() {
  const [contextMenu, setContextMenu] = useState<Menu | null>(null);
  useEffect(() => {
    const listener = () => setContextMenu(null);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  });
  const isTestnetMode = config.testnetModeSetMeToTheStringTrue === "true";
  return (
    <div
      style={{
        background: `${isTestnetMode ? "red" : config.background} url(${
          isTestnetMode ? testnetBackgroundImg : backgroundImg
        }) no-repeat scroll 50% center / 50%`,
        imageRendering: "pixelated",
        height: "100%",
      }}
      onClick={() => setContextMenu(null)}
      onDrag={() => setContextMenu(null)}
    >
      <Theme className="container">
        <RightClickMenuContext.Provider
          value={{
            contextMenu,
            setContextMenu,
          }}
        >
          <DndProvider backend={HTML5Backend}>
            <RainbowKitProvider chains={Object.values(chainConfigs)}>
              <WagmiProvider
                autoConnect
                connectors={connectors}
                provider={provider}
              >
                <WalletSignin>
                  <SequenceSessionProvider>
                    {({ indexers, metadata }) => (
                      <SequenceMetaProvider
                        indexers={indexers}
                        metadata={metadata}
                      >
                        <Vaportrade />
                      </SequenceMetaProvider>
                    )}
                  </SequenceSessionProvider>
                </WalletSignin>
              </WagmiProvider>
            </RainbowKitProvider>
          </DndProvider>
        </RightClickMenuContext.Provider>
        {contextMenu ? (
          <div
            style={{
              position: "fixed",
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
          >
            <StandardMenu
              isActive
              className="css"
              options={contextMenu.menuOptions}
              closeOnClick={(onClicked) => () => {
                setContextMenu(null);
                onClicked();
              }}
            />
          </div>
        ) : null}
      </Theme>
    </div>
  );
}

const defaultSources = [
  "wss://tracker.vaportrade.net",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.files.fm:7073/announce",
  "wss://tracker.btorrent.xyz",
];

function Vaportrade() {
  const [{ data }, disconnect] = useAccount();
  if (!data || !data.connector) {
    throw new Error("No wagmi account !!!");
  }

  const { connector, address } = data;
  const walletName = connector.name;
  const walletIcon = wallets.find((w) => w.id === connector.id)?.iconUrl ?? "";
  const { ens, requestENSLookup } = useContext(IndexerContext);

  const [walletOpen, setWalletOpen] = useState(false);

  const [trackers, updateTrackers] = useImmer<Set<FailableTracker>>(new Set());
  const [sources, updateSources] = useImmer<string[]>([]);
  const [peers, _updatePeers] = useImmer<Set<TradingPeer | Peer>>(new Set());

  // Hack because Immer types don't like things with Readonly in them, hehe
  const updatePeers = (_updatePeers as unknown) as (
    cb: (peers: Set<TradingPeer | Peer>) => void | Set<TradingPeer | Peer>
  ) => void;

  useEffect(() => {
    updateSources(defaultSources);
    fetch(
      "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all_ws.txt"
    )
      .then((r) => r.text())
      .then((newSources) =>
        updateSources([
          ...new Set([
            ...defaultSources,
            ...newSources
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s && s.includes("wss")),
          ]),
        ])
      );
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
  const [showWalletInfo, setShowWalletInfo] = useState<
    false | { chainID?: SupportedChain; minimized: boolean }
  >(false);
  const [showTipUI, setShowTipUI] = useState<boolean | "minimized">(false);
  const [
    activePropertiesWindowIndex,
    setActivePropertiesWindowIndex,
  ] = useState(-1);
  const [properties, updateProperties] = useImmer<Array<PropertiesProps>>([]);

  const closePropertiesWindow = useCallback(
    (props: PropertiesProps) => {
      setActivePropertiesWindowIndex(-1);
      const matching = properties.findIndex(
        (pw) =>
          pw.contractAddress === props.contractAddress &&
          pw.tokenID === props.tokenID
      );
      updateProperties((propertiesWindows) => {
        if (matching !== -1) {
          propertiesWindows.splice(matching, 1);
        }
      });
    },
    [properties, updateProperties]
  );

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
        isActive: !showWalletInfo.minimized,
        icon: walletIcon,
        title: "My Wallet",
        id: 1004,
        minimize: () =>
          setShowWalletInfo({ ...showWalletInfo, minimized: true }),
        open: () => setShowWalletInfo({ ...showWalletInfo, minimized: false }),
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

  const openPropertiesWindow = useCallback(
    (props: PropertiesProps) => {
      updateProperties((propertiesWindows) => {
        if (
          !propertiesWindows.some(
            (pw) =>
              pw.contractAddress === props.contractAddress &&
              pw.tokenID === props.tokenID
          )
        ) {
          propertiesWindows.push(props);
        }
        const idx = propertiesWindows.findIndex(
          (pw) =>
            pw.contractAddress === props.contractAddress &&
            pw.tokenID === props.tokenID
        );
        setActivePropertiesWindowIndex(idx);
      });
    },
    [updateProperties]
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
              address: normalizeAddress(msg.address),
              hasNewInfo: false,
              tradeRequest: false,
              tradeOffer: [],
              myTradeOffer: [],
              goesFirstAddress: "",
              tradeStatus: { type: "negotiating" },
              chat: [],
              chainID:
                config.testnetModeSetMeToTheStringTrue === "true"
                  ? ChainId.POLYGON_MUMBAI
                  : ChainId.POLYGON,
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
              tradingPeer.tradeStatus = { type: "negotiating" };
              tradingPeer.tradeOffer = msg.offer;
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
            } else if (msg.type === "set_chain") {
              if (tradingPeer.tradeStatus.type === "signedOrder") {
                return; // ignore messages once we have a signed order
              }
              if (tradingPeer.tradeStatus.type !== "negotiating") {
                return;
              }
              if (tradingPeer.chainID === msg.chainID) {
                return;
              }
              tradingPeer.chainID = msg.chainID;
              tradingPeer.myTradeOffer = [];
              tradingPeer.tradeOffer = [];
              tradingPeer.tradeStatus = { type: "negotiating" };
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
    address,
    sources,
    updateTrackers,
    updatePeers,
    tradingPartnerAddress,
    p2pClient,
    setTradingPartnerAddress,
  ]);

  useEffect(() => {
    for (const peer of [...peers].filter(isTradingPeer)) {
      requestENSLookup(peer.address);
    }
  });

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
    <PropertiesContext.Provider
      value={{
        properties,
        closePropertiesWindow,
        openPropertiesWindow,
      }}
    >
      {!p2pClient || !trackers.size ? (
        <div className="modal">
          <Window title="Connecting to trackers">
            <div style={{ padding: "8px" }}>
              Connecting to trackers
              <EllipseAnimation />
            </div>
          </Window>
        </div>
      ) : (
        <>
          {tradingPartner ? (
            <TradeContents
              p2pClient={p2pClient}
              tradingPartner={tradingPartner}
              updatePeers={updatePeers}
              onMinimize={() => setTradingPartnerAddress(null)}
              openTipUI={() => setShowTipUI(true)}
              openWalletInfo={(chainID) =>
                setShowWalletInfo({ chainID, minimized: false })
              }
              setWalletIsOpen={setWalletOpen}
            />
          ) : null}
          {showWalletInfo && !showWalletInfo.minimized ? (
            <WalletInfo
              defaultChain={showWalletInfo.chainID}
              onClose={() => setShowWalletInfo(false)}
              onMinimize={() =>
                setShowWalletInfo({
                  ...showWalletInfo,
                  minimized: true,
                })
              }
            />
          ) : null}
        </>
      )}

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
            .map((peer) => [ens.get(peer.address), peer.address] as const)
            .filter(([_, peerAddr]) => address !== peerAddr)
            .map(([ens, peerAddr]) => ({
              title:
                typeof ens === "object"
                  ? (`${ens.ensName} (${peerAddr})` as const)
                  : (`${peerAddr}` as const),
              value: peerAddr,
              alt: `Wallet Address ${peerAddr}`,
              icon: makeBlockyIcon(peerAddr),
            }))}
          onSubmit={(peerAddr) => {
            const correctPeer = [...peers]
              .filter(isTradingPeer)
              .find((p) => p.address === peerAddr);
            if (correctPeer) {
              p2pClient?.send(correctPeer.peer, {
                type: "trade_request",
              });
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
      {activePropertiesWindowIndex !== -1 ? (
        <Properties
          {...properties[activePropertiesWindowIndex]}
          onClose={() =>
            closePropertiesWindow(properties[activePropertiesWindowIndex])
          }
          onMinimize={() => setActivePropertiesWindowIndex(-1)}
        ></Properties>
      ) : null}

      <TaskBar
        openWindows={[
          ...tradeRequests.map((trader, id) => {
            const ensName = ens.get(trader.address);
            return {
              isAlerting:
                trader.hasNewInfo && trader.address !== tradingPartnerAddress,
              title:
                ensName && typeof ensName === "object"
                  ? ensName.ensName
                  : trader.address,
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
            };
          }),
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
          ...properties.map((props, index) => ({
            isActive: activePropertiesWindowIndex === index,
            icon: props.iconUrl || missingIcon,
            title: `${props.name} Properties`,
            id: 5000 + index,
            isAlerting: false,
            onClick: () => {
              if (activePropertiesWindowIndex === index) {
                setActivePropertiesWindowIndex(-1);
              } else {
                setActivePropertiesWindowIndex(index);
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
                setShowWalletInfo({ minimized: false });
              },
            },
          ],
          {
            onClick: () => window.location.reload(),
            title: "Reboot",
            icon: rebootIcon,
          },
          {
            onClick: disconnect,
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
              setShowWalletInfo({ minimized: false });
            },
            icon: makeBlockyIcon(address),
          },
          {
            alt: `Wallet type: ${walletName}`,
            onClick: () => {
              minimizeWindows();
              setShowWalletInfo({ minimized: false });
            },
            icon: walletIcon,
          },
        ]}
      />
    </PropertiesContext.Provider>
  );
}

interface TradeContentsProps {
  p2pClient: P2PT<VaportradeMessage>;
  tradingPartner: TradingPeer;
  updatePeers: (
    cb: (peers: Set<TradingPeer | Peer>) => void | Set<TradingPeer | Peer>
  ) => void;
  onMinimize: () => void;
  openWalletInfo: (chainID?: SupportedChain) => void;
  setWalletIsOpen: (isOpen: boolean) => void;
  openTipUI: () => void;
}
function TradeContents({
  p2pClient,
  tradingPartner,
  updatePeers,
  onMinimize,
  openWalletInfo,
  openTipUI,
  setWalletIsOpen,
}: TradeContentsProps) {
  const { hardError, ens } = useContext(IndexerContext);
  if (hardError) {
    return (
      <div className="modal">
        <Window title="Error">
          <p>Woah, vaportrade hit an unexpected error.</p>
          <p>Reload the page to continue.</p>
          <ButtonForm onClick={() => window.location.reload()}>
            Reload
          </ButtonForm>
          <SafeLink href="https://github.com/arilotter/vaportrade/discussions">
            Ask a question on the vaportrade support forums
          </SafeLink>
          <pre>{hardError}</pre>
        </Window>
      </div>
    );
  }
  const ensName = ens.get(tradingPartner.address);
  return (
    <>
      <div className="modal">
        <Window
          title={`Trading with ${
            ensName && typeof ensName === "object"
              ? `${ensName.ensName} (${tradingPartner.address})`
              : tradingPartner.address
          }`}
          icon={makeBlockyIcon(tradingPartner.address)}
          className="tradeWindow"
          onMinimize={onMinimize}
          onClose={() => {
            updatePeers((peers) => {
              const tradingPeer = [...peers]
                .filter(isTradingPeer)
                .find((p) => p.peer.id === tradingPartner.peer.id);
              if (!tradingPeer) {
                return;
              }
              tradingPeer.tradeRequest = false;
            });
            onMinimize();
          }}
        >
          <div className="appWindowContents">
            <TradeUI
              openWalletInfo={openWalletInfo}
              showTipUI={openTipUI}
              setWalletIsOpen={setWalletIsOpen}
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
              updateGoesFirst={(address) => {
                updatePeers((peers) => {
                  const tp = [...peers]
                    .filter(isTradingPeer)
                    .find((p) => p.address === tradingPartner.address);
                  if (tp) {
                    tp.goesFirstAddress = address;
                  }
                });
              }}
              updateChain={(chainID) => {
                updatePeers((peers) => {
                  const tp = [...peers]
                    .filter(isTradingPeer)
                    .find((p) => p.address === tradingPartner.address);
                  if (tp) {
                    tp.myTradeOffer = [];
                    tp.tradeOffer = [];
                    tp.tradeStatus = { type: "negotiating" };
                    tp.goesFirstAddress = "";
                    tp.chainID = chainID;
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
      </div>
    </>
  );
}

export default App;
