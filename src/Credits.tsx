import { Window } from "packard-belle";
import creditsIcon from "./icons/credits.png";
import { useOnKeyDown } from "./utils/utils";

interface CreditsProps {
  onClose: () => void;
}
export function Credits({ onClose }: CreditsProps) {
  useOnKeyDown("Escape", onClose);
  return (
    <div className="modal">
      <Window title="Credits" icon={creditsIcon} onClose={onClose}>
        <div
          style={{
            lineHeight: "2em",
            paddingRight: "16px",
          }}
        >
          <ul>
            <li>
              Concept: <a href="https://ari.computer/">Ari Lotter</a> &amp;{" "}
              <a href="https://www.instagram.com/matthewshera/">
                Matthew Shera
              </a>
            </li>
            <li>Design &amp; Layout: Matthew Shera &amp; Ari Lotter</li>
            <li>
              Vaportrade Logo:{" "}
              <a href="https://www.instagram.com/soapy_scribbles/">
                @soapy_scribbles
              </a>
            </li>
            <li>
              Development: Ari Lotter with heaps of nft-swap-sdk help from
              @hazucf of trader.xyz
              <br />
              and unending Sequence guidance from William Hua, Michael Yu,
              Philippe Castonguay, &amp; Agustin Aguilar
            </li>
            <li>
              Dependencies: <a href="https://trader.xyz">trader.xyz</a>,{" "}
              <a href="https://0x.org/">0x v3</a>,{" "}
              <a href="https://github.com/subins2000/p2pt">p2pt</a>,{" "}
              <a href="https://sequence.build/">sequence.js</a>,{" "}
              <a href="https://packard-belle.netlify.app/">packard-belle</a>
            </li>
            <li>
              Special thanks: Daniel Rea and everyone on the Sequence team :)
            </li>
          </ul>
        </div>
      </Window>
    </div>
  );
}
