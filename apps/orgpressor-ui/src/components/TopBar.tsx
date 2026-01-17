import { TOP_BAR_HEIGHT, TOP_BAR_COLOR } from "../config";

interface TopBarProps {
  isHighlighted: boolean;
  scale?: number;
}

export function TopBar({ isHighlighted, scale = 1 }: TopBarProps) {
  const scaledHeight = TOP_BAR_HEIGHT * scale;

  return (
    <div
      data-testid="top-bar"
      data-highlighted={isHighlighted}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: scaledHeight,
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
