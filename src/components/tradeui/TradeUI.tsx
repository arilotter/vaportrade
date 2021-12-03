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

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="itemSections">
          <DetailsSection title="My Wallet">
            {address ? (
              <WalletContentsBox
                accountAddress={address}
                indexer={indexer}
                metadata={metadata}
                onItemSelected={setPickBalanceItem}
              />
            ) : (
              <div>
                Loading wallet address
                <EllipseAnimation />
              </div>
            )}
          </DetailsSection>
          {tradingPartner ? (
            <>
              <TradeOffer title="My trade offer" kind="MY_ITEM">
                grungus
              </TradeOffer>
              <TradeOffer title="Partner's trade offer" kind="THEIR_ITEM">
                chungus
              </TradeOffer>
              <DetailsSection title="Their Wallet">
                <WalletContentsBox
                  accountAddress={tradingPartner.address}
                  indexer={indexer}
                  metadata={metadata}
                  onItemSelected={() => {
                    //noop
                  }}
                />
              </DetailsSection>
            </>
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
