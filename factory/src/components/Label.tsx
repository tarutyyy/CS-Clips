import { theme } from "../theme";

export type LabelProps = {
  text: string;
  /** メイン領域（SafeArea）内の座標 */
  x: number;
  y: number;
  width?: number;
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  opacity?: number;
  /** 0〜1。先頭からこの割合だけ文字を見せる（残りは場所だけ確保） */
  reveal?: number;
};

/** 図中の文字。最小サイズ未満にはならない。 */
export const Label = ({
  text,
  x,
  y,
  width = theme.safe.width,
  size = theme.minFontSize,
  color = theme.text,
  align = "center",
  bold = false,
  opacity = 1,
  reveal = 1,
}: LabelProps) => {
  const chars = Array.from(text);
  const n = Math.round(chars.length * Math.min(1, Math.max(0, reveal)));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        textAlign: align,
        fontSize: Math.max(size, theme.minFontSize),
        fontWeight: bold ? 700 : 400,
        color,
        opacity,
        fontFamily: theme.fontFamily,
        whiteSpace: "nowrap",
      }}
    >
      <span>{chars.slice(0, n).join("")}</span>
      <span style={{ opacity: 0 }}>{chars.slice(n).join("")}</span>
    </div>
  );
};
