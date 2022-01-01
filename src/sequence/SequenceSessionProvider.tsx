import { sequence } from "0xsequence";
import { Session } from "@0xsequence/auth";
import { sequenceContext, NetworkConfig } from "@0xsequence/network";
import * as ethers from "ethers";
import { Window } from "packard-belle";
import { useState, useEffect } from "react";
import { config } from "../settings";
import { EllipseAnimation } from "../utils/EllipseAnimation";
import { chainConfigs, Indexers, supportedChains } from "../utils/multichain";
import sequenceLogo from "./sequence.png";

interface SequenceSessionProviderProps {
  children: (props: SequenceIndexerProps) => JSX.Element;
}

interface SequenceIndexerProps {
  indexers: Indexers;
  metadata: sequence.metadata.Metadata;
}

type State =
  | {
      waitingFor:
        | "signer"
        | "signer_address"
        | "session"
        | "indexer_and_metadata";
    }
  | { error: Array<string> }
  | {
      indexers: Indexers;
      metadata: sequence.metadata.Metadata;
    };

enum SignerLevel {
  Gold = 3,
  Silver = 2,
  Bronze = 1,
}

export function SequenceSessionProvider({
  children,
}: SequenceSessionProviderProps) {
  const [state, setState] = useState<State>({ waitingFor: "signer" });
  useEffect(() => {
    async function getIndexer() {
      // Hardcoded useless wallet key, so that you can get into Sequence API.
      const signer = ethers.Wallet.fromMnemonic(
        "charge era satisfy ocean inmate miracle frown slab security note cover amused"
      );
      setState({ waitingFor: "signer_address" });
      const signerAddress = await signer.getAddress();
      setState({ waitingFor: "session" });
      const session = await Session.open({
        sequenceApiUrl: services.api,
        sequenceMetadataUrl: services.metadata,
        context: sequenceContext,
        networks: Object.entries(chainConfigs)
          .filter(
            ([_, chain]) =>
              (config.testnetModeSetMeToTheStringTrue === "true") ===
              chain.testnet
          )
          .reduce(
            (networks, [chainId, chain]) => [
              ...networks,
              { ...chain, chainId: Number.parseInt(chainId) },
            ],
            [] as NetworkConfig[]
          ),
        referenceSigner: signerAddress,
        signers: [
          {
            signer: signer,
            weight: SignerLevel.Gold,
          },
        ],
        threshold: SignerLevel.Gold,
        metadata: {
          name: "vaportrade",
          // 1 day JWT expiry
          expiration: 60 * 60 * 24 * 1,
        },
      });
      setState({ waitingFor: "indexer_and_metadata" });
      const [indexers, metadata] = await Promise.all([
        Promise.all(
          supportedChains.map((chainID) =>
            session.getIndexerClient(chainID).then((indexer) => ({
              chainID,
              indexer,
            }))
          )
        ).then((p) =>
          p.reduce<Indexers>((indexers, { chainID, indexer }) => {
            indexers[chainID] = indexer;
            return indexers;
          }, {} as any)
        ),
        session.getMetadataClient(),
      ]);
      setState({ indexers, metadata });
    }
    getIndexer().catch((err) => {
      console.error(`Failed to get Indexer.`, err, new Error().stack);
      if (isSequenceError(err)) {
        const stack = new Error().stack;
        setState({
          error: [
            `${err.code} (${err.status}): ${err.msg}`,
            ...(err.cause ? [`---`, err.cause] : []),
            ...(err.error ? [`---`, err.error] : []),
            ...(stack ? [`---`, ...stack.split("\n")] : []),
          ],
        });
      } else if (err instanceof Error) {
        setState({ error: err.toString().split("\n") });
      }
    });
  }, []);

  if ("error" in state) {
    return (
      <div className="modal">
        <Window title="Error connecting to Sequence Indexer">
          {state.error.map((e, i) => (
            <p key={i} style={{ padding: "8px" }}>
              {e}
            </p>
          ))}
        </Window>
      </div>
    );
  } else if ("waitingFor" in state) {
    return (
      <div className="modal">
        <Window title="Loading Sequence Indexer" icon={sequenceLogo}>
          <p style={{ padding: "8px" }}>
            Waiting for {state.waitingFor}
            <EllipseAnimation />
          </p>
        </Window>
      </div>
    );
  } else {
    return children(state);
  }
}
interface SequenceError {
  status: number;
  code: string;
  cause?: string;
  msg: string;
  error?: string;
}

function isSequenceError(err: any): err is SequenceError {
  return (
    "status" in err &&
    typeof err.status === "number" &&
    "code" in err &&
    typeof err.code === "string" &&
    "msg" in err &&
    typeof err.msg === "string"
  );
}

const corsProxy = config.corsAnywhereUrl;

export const services = {
  api: `${corsProxy}https://api.sequence.app`,
  metadata: `${corsProxy}https://metadata.sequence.app`,
} as const;
