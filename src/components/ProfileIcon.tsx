import ReactBlockies from "react-blockies";
import "./ProfileIcon.css";
interface ProfileIconProps {
  seed: string;
  size?: number;
  scale?: number;
  color?: string;
  bgColor?: string;
  spotColor?: string;
  className?: string;
}

export const defaultSize = 8;
export const defaultScale = 6;

export function ProfileIcon(props: ProfileIconProps) {
  const {
    seed,
    size = defaultSize,
    scale = defaultScale,
    color,
    bgColor,
    spotColor,
    className,
  } = props;

  return (
    <div className="profileIcon">
      <ReactBlockies
        className={className}
        seed={seed.toUpperCase()}
        size={size}
        scale={scale}
        color={color}
        bgColor={bgColor}
        spotColor={spotColor}
      />
    </div>
  );
}
