import { useEffect, useState } from "react";
import { sequence } from "0xsequence";
import { TokenBalance } from "@0xsequence/indexer";

import "./TradeUI.css";

interface TradeUIProps {
  wallet: sequence.Wallet;
  indexer: sequence.indexer.Indexer;
}

export function TradeUI({ wallet, indexer }: TradeUIProps) {
  const [items, setItems] = useState<TokenBalance[]>([]);

  useEffect(() => {
    async function getItems() {
      const address = await wallet.getAddress();
      const { balances } = await indexer.getTokenBalances({
        accountAddress: address,
      });
      setItems(balances);
    }
    getItems();
  });

  return (
    <div>
      {items}
      {/* <ItemsBox items={["asfd", "asdfasdfasdf", "chungus"]} /> */}
    </div>
  );
}
