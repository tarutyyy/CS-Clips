import { theme } from "../theme";

type ChipProps = {
  text: string;
  /** メイン領域（SafeArea）内の座標（左上） */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 塗りの色。outline のときは枠と文字の色 */
  color?: string;
  /** true なら枠だけ（関数の箱など） */
  outline?: boolean;
  size?: number;
  mono?: boolean;
  opacity?: number;
  scale?: number;
  /** 0〜1。外側の光 */
  glow?: number;
  glowColor?: string;
};

/** 文字の入った角丸の札（キー・値・関数の箱）。位置や強調は呼び出し側が frame から作って渡す。 */
export const Chip = ({
  text,
  x,
  y,
  width,
  height,
  color = theme.blue,
  outline = false,
  size = 44,
  mono = false,
  opacity = 1,
  scale = 1,
  glow = 0,
  glowColor = theme.yellow,
}: ChipProps) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      boxSizing: "border-box",
      borderRadius: 14,
      border: outline ? `4px solid ${color}` : undefined,
      background: outline ? undefined : color,
      color: outline ? color : theme.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: mono ? theme.monoFamily : theme.fontFamily,
      fontSize: Math.max(size, theme.minFontSize),
      fontWeight: 700,
      whiteSpace: "nowrap",
      opacity,
      transform: `scale(${scale})`,
      boxShadow: glow > 0 ? `0 0 ${32 * glow}px ${glowColor}` : undefined,
    }}
  >
    {text}
  </div>
);
