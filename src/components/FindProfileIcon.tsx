import { defaultScale, defaultSize } from "./ProfileIcon";
import "./FindProfileIcon.css";
interface FindProfileIconProps {
  size?: number;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function FindProfileIcon(props: FindProfileIconProps) {
  const {
    size = defaultSize,
    scale = defaultScale,
    className,
    onClick,
  } = props;

  return (
    <div
      className={`findProfileIcon ${className ? className : ""}`}
      style={{
        width: `${size * scale}px`,
        height: `${size * scale}px`,
        background: "rgb(187, 195, 196)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClick}
    >
      <div
        style={{
          fontFamily: "Arial,sans-serif",
          fontSize: "4em",
          color: "#126fc2",
        }}
      >
        +
      </div>
    </div>
  );
}
