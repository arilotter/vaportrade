import clippy from "./clippy.gif";
import "./Clippy.css";
import { useState } from "react";

interface ClippyProps {
  message: string;
}
export function Clippy({ message }: ClippyProps) {
  const [isHovering, setIsHovering] = useState(false);
  return (
    <div className="clippyContainer">
      <div className="speechBubble">
        {isHovering ? <p>don't touch me.</p> : <p>{message}</p>}
        <div className="speechBubbleArrow"></div>
      </div>

      <img
        src={clippy}
        alt="It's Clippy!"
        style={{
          height: "100%",
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      />
    </div>
  );
}
