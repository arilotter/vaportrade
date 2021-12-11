import { sequence } from "0xsequence";
import { Session } from "@0xsequence/auth";
import { sequenceContext, ChainId } from "@0xsequence/network";
import * as ethers from "ethers";
import { Window } from "packard-belle";
import { useState, useEffect } from "react";
import { config } from "../settings";
import { EllipseAnimation } from "../utils/EllipseAnimation";

interface SequenceSessionProviderProps {
  wallet: sequence.Wallet;
  children: (props: SequenceIndexerProps) => JSX.Element;
}

interface SequenceIndexerProps {
  indexer: sequence.indexer.Indexer;
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
      indexer: sequence.indexer.Indexer;
      metadata: sequence.metadata.Metadata;
    };

enum SignerLevel {
  Gold = 3,
  Silver = 2,
  Bronze = 1,
}

const DefaultThreshold = SignerLevel.Gold;

export function SequenceSessionProvider({
  children,
  wallet,
}: SequenceSessionProviderProps) {
  const [state, setState] = useState<State>({ waitingFor: "signer" });
  useEffect(() => {
    async function getIndexer() {
      const signer = ethers.Wallet.fromMnemonic(
        "major danger this key only test please avoid main net use okay"
      );
      setState({ waitingFor: "signer_address" });
      const signerAddress = await signer.getAddress();
      setState({ waitingFor: "session" });
      const session = await Session.open({
        sequenceApiUrl: services.api,
        sequenceMetadataUrl: services.metadata,
        context: { ...sequenceContext, nonStrict: true },
        networks,
        referenceSigner: signerAddress,
        signers: [
          {
            signer: signer,
            weight: SignerLevel.Gold,
          },
        ],
        threshold: DefaultThreshold,
        metadata: {
          name: "vaportrade",
          // 1 day JWT expiry
          expiration: 60 * 60 * 24 * 1,
        },
      });
      setState({ waitingFor: "indexer_and_metadata" });
      const [indexer, metadata] = await Promise.all([
        session.getIndexerClient(ChainId.POLYGON),
        session.getMetadataClient(),
      ]);
      setState({ indexer, metadata });
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
  }, [wallet]);

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
        <Window title="Loading Sequence Indexer">
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
  guard: `${corsProxy}https://guard.sequence.app`,
  metadata: `${corsProxy}https://metadata.sequence.app`,
  indexer: `${corsProxy}https://polygon-indexer.sequence.app`,
  relayer: `${corsProxy}https://polygon-relayer.sequence.app`,
  nodes: `${corsProxy}https://nodes.sequence.app/polygon`,
} as const;

export const networks = [
  {
    chainId: ChainId.POLYGON,
    name: "polygon",
    title: "Polygon",
    rpcUrl: services.nodes,
    relayer: { url: services.relayer },
    indexerUrl: services.indexer,
    isDefaultChain: true,
    isAuthChain: true,
  },
];
