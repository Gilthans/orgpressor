import { TOP_BAR_HEIGHT, TOP_BAR_COLOR } from "../config";

interface TopBarProps {
  isHighlighted: boolean;
}

export function TopBar({ isHighlighted }: TopBarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: TOP_BAR_HEIGHT,
        backgroundColor: isHighlighted
          ? TOP_BAR_COLOR.highlightBackground
          : TOP_BAR_COLOR.background,
        borderBottom: `2px solid ${
          isHighlighted ? TOP_BAR_COLOR.highlightBorder : TOP_BAR_COLOR.border
        }`,
        pointerEvents: "none",
        zIndex: 1,
        transition: "background-color 0.15s, border-color 0.15s",
      }}
    />
  );
}
