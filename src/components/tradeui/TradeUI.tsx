import { useEffect, useState } from "react";
import { sequence } from "0xsequence";
import { TokenBalance } from "@0xsequence/indexer";

import "./TradeUI.css";
import { Item, ItemsBox } from "./ItemsBox";
import { ContractInfo } from "@0xsequence/metadata";
import { useImmer } from "use-immer";
import { ChainId } from "@0xsequence/network";
import P2PT, { Peer } from "p2pt";
import { ButtonProgram, DetailsSection } from "packard-belle";
import { makeBlockyIcon } from "../../makeBlockyIcon";
import { TRADE_REQUEST_MESSAGE } from "../../utils/types";

const chainId = ChainId.POLYGON;

interface TradeUIProps {
  wallet: sequence.Wallet;
  indexer: sequence.indexer.Indexer;
  metadata: sequence.metadata.SequenceMetadataClient;
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
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [tradingPartnerBalances, setTradingPartnerBalances] = useState<
    TokenBalance[]
  >([]);
  const [contracts, updateContracts] = useImmer<
    Map<ContractKey, ContractInfo | "fetching">
  >(new Map());

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
    async function getBalances() {
      const address = await wallet.getAddress();
      const { balances } = await indexer.getTokenBalances({
        accountAddress: address,
      });
      setBalances(balances);
    }
    getBalances();
  }, [indexer, wallet]);

  useEffect(() => {
    async function getTradingPartnerBalances() {
      if (!tradingPartner) {
        setTradingPartnerBalances([]);
      } else {
        const { balances } = await indexer.getTokenBalances({
          accountAddress: tradingPartner.address,
        });
        setTradingPartnerBalances(balances);
      }
    }
    getTradingPartnerBalances();
  }, [indexer, tradingPartner]);

  useEffect(() => {
    const contractAddresses = [
      ...new Set(
        [...balances, ...tradingPartnerBalances].map((t) => t.contractAddress)
      ),
    ];
    if (!contractAddresses.length) {
      return;
    }

    const batchContractAddresses: string[] = [];
    for (const contractAddress of contractAddresses) {
      const key = getContractKey(contractAddress, chainId);

      if (contractAddress !== "0x0" && !contracts.has(key)) {
        batchContractAddresses.push(contractAddress);
      }
    }

    if (batchContractAddresses.length) {
      const batchPromise = metadata.getContractInfoBatch({
        contractAddresses: batchContractAddresses,
        chainID: String(chainId),
      });
      batchPromise.then(({ contractInfoMap }) => {
        updateContracts((contracts) => {
          for (const contractAddress of batchContractAddresses) {
            const key = getContractKey(contractAddress, chainId);
            contracts.set(key, contractInfoMap[contractAddress.toLowerCase()]);
          }
        });
      });
      updateContracts((contracts) => {
        for (const contractAddress of batchContractAddresses) {
          const key = getContractKey(contractAddress, chainId);
          if (!contracts.has(key)) {
            contracts.set(key, "fetching");
          }
        }
      });
    }
  }, [balances, tradingPartnerBalances, metadata, contracts, updateContracts]);

  return (
    <div className="tradeUI">
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
      <div className="itemSections">
        <DetailsSection title="My Wallet">
          <ItemsBox items={getItems(balances, contracts)} />
        </DetailsSection>
        {tradingPartner && tradingPartnerBalances.length ? (
          <DetailsSection title={`${tradingPartner.address}`}>
            <ItemsBox items={getItems(tradingPartnerBalances, contracts)} />
          </DetailsSection>
        ) : null}
      </div>
    </div>
  );
}

function getItems(
  balances: TokenBalance[],
  contracts: Map<ContractKey, ContractInfo | "fetching">
): Item[] {
  return balances
    .map<Item | null>((balance) => {
      const key = getContractKey(balance.contractAddress, chainId);
      const contract = contracts.get(key);
      return typeof contract === "object"
        ? {
            address: balance.contractAddress,
            balance: balance.balance,
            iconUrl: contract.logoURI,
            name: contract.name,
          }
        : null;
    })
    .filter((i): i is Item => i !== null);
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

function getContractKey(contractAddress: string, chainId: ChainId) {
  return `${chainId}:${contractAddress.toLowerCase()}` as const;
}

type ContractKey = ReturnType<typeof getContractKey>;
