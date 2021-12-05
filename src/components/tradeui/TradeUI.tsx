import { useEffect, useState } from "react";
import { sequence } from "0xsequence";
import "./TradeUI.css";
import P2PT from "p2pt";
import { ButtonForm, Checkbox, DetailsSection } from "packard-belle";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { EllipseAnimation } from "../../utils/EllipseAnimation";
import { WalletContentsBox } from "./WalletContentsBox";
import { TradeOffer } from "./TradeOffer";
import { Item, TradingPeer, VaportradeMessage } from "../../utils/utils";
import { PickAmountWindow } from "./PickAmountWindow";
import { Tabs } from "../Tabs";
import { useImmer } from "use-immer";

import tradeIcon from "./send.png";
import { PartnerTradeOffer } from "./PartnerTradeOffer";

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

  useEffect(() => {
    wallet.getAddress().then(setAddress);
  }, [wallet]);

  const [pickBalanceItem, setPickBalanceItem] = useState<Item | null>(null);
  const [myTradeOffer, updateMyTradeOffer] = useImmer<Item[]>([]);
  const [offerAccepted, setOfferAccepted] = useState(false);

  useEffect(() => {
    setOfferAccepted(false);
  }, [myTradeOffer, tradingPartner?.tradeOffer]);

  useEffect(() => {
    if (!p2p || !tradingPartner?.peer) {
      return;
    }
    p2p.send(tradingPartner.peer, {
      type: "offer",
      offer: myTradeOffer.map((item) => ({
        address: item.address,
        balance: item.balance.toString(),
        originalBalance: item.originalBalance.toString(),
        tokenID: item.tokenID,
      })),
      hash: "", // TODO
    });
  }, [p2p, tradingPartner?.peer, myTradeOffer]);

  useEffect(() => {
    if (!p2p || !tradingPartner?.peer) {
      return;
    }
    p2p.send(tradingPartner.peer, {
      type: "lockin",
      isLocked: offerAccepted,
      hash: "",
    });
  }, [p2p, tradingPartner?.peer, offerAccepted]);

  const bothPlayersAccepted = offerAccepted && tradingPartner?.offerAccepted;

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="itemSections">
          <Tabs
            style={{ flex: "1", height: "100%" }}
            tabs={[
              {
                title: "My Wallet",
                contents: address ? (
                  <WalletContentsBox
                    accountAddress={address}
                    indexer={indexer}
                    metadata={metadata}
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
                          metadata={metadata}
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
          {tradingPartner ? (
            <div className="offers">
              <DetailsSection title="My trade offer">
                <TradeOffer
                  items={myTradeOffer}
                  onItemSelected={(item) => {
                    // swap current balance :)
                    const diff = item.originalBalance.subUnsafe(item.balance);
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
                <ButtonForm isDisabled={!bothPlayersAccepted}>
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
                  checked={tradingPartner.offerAccepted}
                  id="partnerAccept"
                  label="Partner Accepts"
                  isDisabled
                />
              </div>
              <DetailsSection title="Partner's trade offer">
                <PartnerTradeOffer
                  indexer={indexer}
                  metadata={metadata}
                  items={tradingPartner.tradeOffer}
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
                  i.address === pickBalanceItem.address &&
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
