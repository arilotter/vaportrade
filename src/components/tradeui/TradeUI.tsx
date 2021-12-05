import { useEffect, useState } from "react";
import { sequence } from "0xsequence";
import "./TradeUI.css";
import P2PT from "p2pt";
import { DetailsSection } from "packard-belle";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { EllipseAnimation } from "../../utils/EllipseAnimation";
import { WalletContentsBox } from "./WalletContentsBox";
import { TradeOffer } from "./TradeOffer";
import { Item, TradingPeer } from "../../utils/utils";
import { PickAmountWindow } from "./PickAmountWindow";
import { Tabs } from "../Tabs";
import { useImmer } from "use-immer";
interface TradeUIProps {
  wallet: sequence.Wallet;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  p2pt: P2PT | null;
  tradingPartner: TradingPeer | null;
}

export function TradeUI({
  wallet,
  indexer,
  metadata,
  tradingPartner,
  p2pt,
}: TradeUIProps) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    wallet.getAddress().then(setAddress);
  }, [wallet]);

  const [pickBalanceItem, setPickBalanceItem] = useState<Item | null>(null);
  const [myTradeOffer, updateMyTradeOffer] = useImmer<Item[]>([]);
  const [partnerTradeOffer, updatePartnerTradeOffer] = useImmer<Item[]>([]);

  // When your trading partner changes, reset your offer.
  useEffect(() => {
    updatePartnerTradeOffer(() => []);
    updateMyTradeOffer(() => []);
  }, [tradingPartner, updatePartnerTradeOffer, updateMyTradeOffer]);

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
                    onItemSelected={setPickBalanceItem}
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
                <TradeOffer items={myTradeOffer} onItemSelected={() => {}} />
              </DetailsSection>
              <DetailsSection title="Partner's trade offer">
                <TradeOffer
                  items={partnerTradeOffer}
                  onItemSelected={() => {}}
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
            alert(`Adding ${amount} ${pickBalanceItem} to trade. TODO.`);
            setPickBalanceItem(null);
          }}
        />
      ) : null}
    </>
  );
}
