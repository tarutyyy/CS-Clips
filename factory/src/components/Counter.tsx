import { theme } from "../theme";

type CounterProps = {
  /** 表示する値。アニメーションは呼び出し側が tween で作って渡す */
  value: number;
  label: string;
  color?: string;
};

/** 数値と説明を縦に並べる。frame に依存しない見た目だけの部品。 */
export const Counter = ({ value, label, color = theme.text }: CounterProps) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: theme.fontFamily,
    }}
  >
    <div
      style={{
        fontFamily: theme.monoFamily,
        fontSize: 120,
        fontWeight: 700,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {Math.round(value).toLocaleString("en-US")}
    </div>
    <div style={{ fontSize: theme.minFontSize + 4, color: theme.muted }}>{label}</div>
  </div>
);
