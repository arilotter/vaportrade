import sequenceLogo from "./sequence.png";
import { Window, ButtonForm, DetailsSection } from "packard-belle";
import { sequence } from "0xsequence";
import { ETHAuth } from "@0xsequence/ethauth";
import { useEffect, useMemo, useState } from "react";

import "./ConnectToSequence.css";
import { EllipseAnimation } from "../utils/EllipseAnimation";
import { config } from "../settings";
import { ControlPanel } from "../ControlPanel";

export const wallet = new sequence.Wallet("polygon", {
  walletAppURL: config.sequenceWalletWebappUrl,
});

interface WalletProviderProps {
  wallet: sequence.Wallet;
  address: string;

  // WORKAROUND BUG IN SEQUENCE.JS:
  // disconnect callback is never called.
  disconnect: () => void;
}

interface ConnectToSequenceProps {
  children(props: WalletProviderProps): JSX.Element;
}
export function ConnectToSequence(props: ConnectToSequenceProps) {
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [walletConnectionState, setWalletConnected] = useState<
    | "no"
    | "connecting"
    | "connected"
    | "fetching_address"
    | { address: string }
    | { error: string }
  >(wallet.isConnected() ? "connected" : "no");
  useMemo(() => {
    wallet.on("connect", () => {
      setWalletConnected("connected");
    });
    wallet.on("disconnect", () => {
      // never fires. bug.
      setWalletConnected("no");
    });
  }, []);

  useEffect(() => {
    if (walletConnectionState === "connected") {
      setWalletConnected("fetching_address");
      wallet.getAddress().then((address) => setWalletConnected({ address }));
    }
  }, [walletConnectionState]);

  if (
    typeof walletConnectionState === "object" &&
    "address" in walletConnectionState
  ) {
    return props.children({
      wallet,
      address: walletConnectionState.address,
      disconnect: () => {
        wallet.disconnect();
        setWalletConnected(wallet.isConnected() ? "connected" : "no");
      },
    });
  }

  return (
    <>
      <div className="modal">
        <Window
          className="WindowAlert notConnected"
          title={"No wallet connected!"}
          resizable={false}
        >
          <div
            className="WindowAlert__message has-icon"
            style={{
              backgroundImage: `url(${sequenceLogo})`,
              textAlign: "center",
              display: "inline-block",
            }}
          >
            <ButtonForm
              isDisabled={walletConnectionState === "connecting"}
              onClick={async () => {
                setWalletConnected("connecting");
                try {
                  await connectWallet(wallet, true);
                  setWalletConnected("connected");
                } catch (err) {
                  if (err instanceof Error) {
                    console.error("Failed to connect to wallet:", err);
                    setWalletConnected({ error: err.message });
                  }
                }
              }}
              className="walletConnectButton"
            >
              {walletConnectionState === "connecting" ? (
                <>
                  Connecting <EllipseAnimation />
                </>
              ) : (
                "Connect your Sequence wallet"
              )}
            </ButtonForm>
            {typeof walletConnectionState === "object" ? (
              <DetailsSection title="Error">
                <p>{walletConnectionState.error}</p>
              </DetailsSection>
            ) : null}
          </div>
          <ButtonForm onClick={() => setControlPanelOpen(true)}>
            Control Panel
          </ButtonForm>
        </Window>
      </div>
      {controlPanelOpen ? (
        <ControlPanel onClose={() => setControlPanelOpen(false)} />
      ) : null}
    </>
  );
}

const connectWallet = async (
  wallet: sequence.Wallet,
  authorize: boolean = false
) => {
  const connectDetails = await wallet.connect({
    app: "vaportrade",
    authorize: true,
  });

  if (authorize) {
    if (!connectDetails.proof) {
      throw new Error("You didn't authorize vaportrade!");
    }
    const ethAuth = new ETHAuth();

    const decodedProof = await ethAuth.decodeProof(
      connectDetails.proof.proofString,
      true
    );

    const isValid = await wallet.commands.isValidTypedDataSignature(
      await wallet.getAddress(),
      connectDetails.proof.typedData,
      decodedProof.signature,
      await wallet.getAuthChainId()
    );

    if (!isValid) {
      throw new Error("Invalid signature. Wtf?");
    }
  }
};
