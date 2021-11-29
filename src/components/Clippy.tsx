import clippy from "./clippy.gif";
import clippyMad from "./clippymad.gif";
import "./Clippy.css";
import { useState } from "react";

interface ClippyProps {
  message: string;
}

const angryDialog = [
  "don't touch me.",
  "i mean it.",
  "stop.",
  "STOP.",
  "FUCK OFF.",
  "i'm leaving, fuck this",
  ".........",
];

export function Clippy({ message }: ClippyProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  return (
    <div className="clippyContainer">
      <div className="speechBubble">
        {isHovering ? angryDialog[clickCount] : <p>{message}</p>}
        <div className="speechBubbleArrow"></div>
      </div>

      <img
        src={isHovering ? clippyMad : clippy}
        alt="It's Clippy!"
        style={{
          height: "100%",
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setClickCount(0);
        }}
        onClick={() => {
          setClickCount(Math.min(angryDialog.length - 1, clickCount + 1));
        }}
      />
    </div>
  );
}
