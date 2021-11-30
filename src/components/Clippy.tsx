import clippy from "./clippy.gif";
import clippyMad from "./clippymad.gif";
import "./Clippy.css";
import { useEffect, useState } from "react";

interface ClippyProps {
  message: string;
  onOutOfMessages?: () => void;
}

const angryDialog = [
  "don't touch me.",
  "i mean it.",
  "stop.",
  "STOP.",
  "please just leave me alone.",
  "fine. you've harassed me enough. i'm leaving.",
  ".........",
];

export function Clippy({ message, onOutOfMessages }: ClippyProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  useEffect(() => {
    if (clickCount === angryDialog.length - 1) {
      onOutOfMessages?.();
    }
  });
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
