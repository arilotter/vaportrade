import { Window } from "packard-belle";
import creditsIcon from "./icons/credits.png";
import { SafeLink } from "./utils/SafeLink";
import { useOnKeyDown } from "./utils/utils";

interface CreditsProps {
  onClose: () => void;
  onMinimize: () => void;
}
export function Credits({ onClose, onMinimize }: CreditsProps) {
  useOnKeyDown("Escape", onClose);
  return (
    <div className="modal">
      <Window
        title="Credits"
        icon={creditsIcon}
        onClose={onClose}
        onMinimize={onMinimize}
      >
        <div
          style={{
            lineHeight: "2em",
            paddingRight: "16px",
          }}
        >
          <ul>
            <li>
              Concept:{" "}
              <SafeLink href="https://ari.computer/">Ari Lotter</SafeLink> &amp;{" "}
              <SafeLink href="https://www.instagram.com/matthewshera/">
                Matthew Shera
              </SafeLink>
            </li>
            <li>Design &amp; Layout: Matthew Shera &amp; Ari Lotter</li>
            <li>
              Vaportrade Logo:{" "}
              <SafeLink href="https://www.instagram.com/soapy_scribbles/">
                @soapy_scribbles
              </SafeLink>
            </li>
            <li>
              Development: Ari Lotter with heaps of nft-swap-sdk help from
              @hazucf of trader.xyz
              <br />
              and unending Sequence guidance from William Hua, Michael Yu,
              Philippe Castonguay, &amp; Agustin Aguilar
            </li>
            <li>
              Dependencies:{" "}
              <SafeLink href="https://trader.xyz">trader.xyz</SafeLink>,{" "}
              <SafeLink href="https://0x.org/">0x v3</SafeLink>,{" "}
              <SafeLink href="https://github.com/subins2000/p2pt">
                p2pt
              </SafeLink>
              , <SafeLink href="https://sequence.build/">sequence.js</SafeLink>,{" "}
              <SafeLink href="https://packard-belle.netlify.app/">
                packard-belle
              </SafeLink>
              ,
              <br />
              <SafeLink href="#">RainbowKit</SafeLink>,{" "}
              <SafeLink href="https://ethers.org/">ethers</SafeLink>,{" "}
              <SafeLink href="https://github.com/stephensprinkle-zz/react-blockies">
                react blockies
              </SafeLink>
              ,{" "}
              <SafeLink href="https://github.com/pedrouid/blockies-ts">
                blockies-ts
              </SafeLink>
              ,{" "}
              <SafeLink href="https://immerjs.github.io/immer/">immer</SafeLink>
              , & <SafeLink href="https://reactjs.org/">react</SafeLink>
            </li>
            <li>
              Special thanks: Daniel Rea and everyone on the Sequence team :)
            </li>
            <li>
              Follow
              <SafeLink href="https://twitter.com/usevaportrade">
                {" "}
                @usevaportrade{" "}
              </SafeLink>{" "}
              on that bird app or shoot me an email at{" "}
              <a href="mailto:vaportrade.net@gmail.com">
                vaportrade.net@gmail.com
              </a>
            </li>
            <li>
              vaportrade.net is open source!{" "}
              <SafeLink href="https://github.com/arilotter/vaportrade/">
                https://github.com/arilotter/vaportrade/
              </SafeLink>
            </li>
          </ul>
        </div>
      </Window>
    </div>
  );
}
