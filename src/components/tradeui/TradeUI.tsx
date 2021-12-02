import { useEffect, useState } from "react";
import { sequence } from "0xsequence";
import "./TradeUI.css";
import P2PT, { Peer } from "p2pt";
import { ButtonProgram, DetailsSection } from "packard-belle";
import { makeBlockyIcon } from "../../makeBlockyIcon";
import { TRADE_REQUEST_MESSAGE } from "../../utils/utils";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { EllipseAnimation } from "../../utils/EllipseAnimation";
import { ItemsBox } from "./ItemsBox";
interface TradeUIProps {
  wallet: sequence.Wallet;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.Metadata;
  tradeRequests: TradeRequest[];
  p2pt: P2PT | null;
}

export interface TradeRequest {
  address: string;
  peer: Peer;
}

export function TradeUI({
  wallet,
  indexer,
  metadata,
  tradeRequests,
  p2pt,
}: TradeUIProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [tradingPartner, setTradingPartner] = useState<TradeRequest | null>(
    null
  );

  useEffect(() => {
    p2pt?.on("peerclose", (peer) => {
      if (tradingPartner?.peer.id === peer.id) {
        setTradingPartner(null);
      }
    });
  }, [p2pt, tradingPartner, setTradingPartner]);

  useEffect(() => {
    wallet.getAddress().then(setAddress);
  }, [wallet]);

  return (
    <div>
      <div>
        {tradeRequests.map((request) => (
          <TradeRequestPopup
            key={request.address}
            address={request.address}
            isActive={request.address === tradingPartner?.address}
            onClick={() => {
              p2pt?.send(request.peer, TRADE_REQUEST_MESSAGE);
              setTradingPartner(request);
            }}
          />
        ))}
      </div>
      <DndProvider backend={HTML5Backend}>
        <div className="itemSections">
          <DetailsSection title="My Wallet">
            {address ? (
              <ItemsBox
                accountAddress={address}
                indexer={indexer}
                metadata={metadata}
              />
            ) : (
              <div>
                Loading wallet address
                <EllipseAnimation />
              </div>
            )}
          </DetailsSection>
          {tradingPartner ? (
            <DetailsSection title={`${tradingPartner.address}`}>
              <ItemsBox
                accountAddress={tradingPartner.address}
                indexer={indexer}
                metadata={metadata}
              />
            </DetailsSection>
          ) : null}
        </div>
      </DndProvider>
    </div>
  );
}

function TradeRequestPopup({
  address,
  isActive,
  onClick,
}: {
  address: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonProgram
      icon={makeBlockyIcon(address)}
      isActive={isActive}
      onClick={onClick}
    >
      {address}
    </ButtonProgram>
  );
}
