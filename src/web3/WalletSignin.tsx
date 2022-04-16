import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ButtonForm, Window } from "packard-belle";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ControlPanel } from "../ControlPanel";
import controlPanelIcon from "../icons/controlPanel.png";
import rebootIcon from "../icons/reboot.png";
import vaportradeLogo from "../icons/vticon.png";
import warningIcon from "../icons/warning.png";
import { SafeLink } from "../utils/SafeLink";
import "./WalletSignin.css";
import "../../node_modules/@rainbow-me/rainbowkit/dist/index.css";
interface WalletSigninProps {
  children: JSX.Element;
}

export function WalletSignin({ children }: WalletSigninProps) {
  const [controlPanelOpen, setControlPanelOpen] = useState(false);

  const [{ data }] = useAccount();

  if (data) {
    return children;
  }
  return (
    <div className="modal">
      {controlPanelOpen ? (
        <ControlPanel onClose={() => setControlPanelOpen(false)} />
      ) : (
        <Window
          title="Connect your web3 wallet"
          className="web3Modal"
          icon={vaportradeLogo}
        >
          <div style={{ textAlign: "center", padding: "8px 8px 0 8px" }}>
            <img
              className="walletConnectButtonLogo"
              width={32}
              height={32}
              src={warningIcon}
              alt={"Warning!"}
            />
            <p>
              <strong>PRIVACY WARNING</strong>
            </p>
            <p>
              vaportrade.net uses peer-to-peer (p2p) communication via WebRTC.
            </p>
            <p>
              After connecting your wallet, your IP address and wallet address
              will be published to other vaportrade.net users so you can trade.
            </p>
          </div>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <div className="walletConnectButton">
                <ButtonForm
                  className="walletConnectButton"
                  onClick={openConnectModal}
                >
                  Connect Wallet
                </ButtonForm>
              </div>
            )}
          </ConnectButton.Custom>

          <hr />
          <div className="walletConnectButton">
            <ButtonForm
              className="walletConnectButton"
              onClick={() => setControlPanelOpen(true)}
            >
              <img
                className="walletConnectButtonLogo"
                width={16}
                height={16}
                src={controlPanelIcon}
                alt="Control Panel"
              />
              Control Panel
            </ButtonForm>
            <ButtonForm
              className="walletConnectButton"
              onClick={() => window.location.reload()}
            >
              <img
                className="walletConnectButtonLogo"
                width={16}
                height={16}
                src={rebootIcon}
                alt="Reboot"
              />
              Reload
            </ButtonForm>
          </div>
          <div
            style={{
              textAlign: "center",
            }}
          >
            <SafeLink href="https://github.com/arilotter/vaportrade/">
              click here for the source code!
            </SafeLink>
          </div>
        </Window>
      )}
    </div>
  );
}
