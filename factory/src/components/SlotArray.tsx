import { theme } from "../theme";
import type { Rect } from "../geometry";
import { appearScale, glowFrame } from "./frame";

export type SlotLayout = {
  count: number;
  /** 番号ラベルを含めた左上（メイン領域内の座標） */
  x: number;
  y: number;
  /** 番号ラベルの幅。箱はその右に並ぶ */
  indexWidth: number;
  slotWidth: number;
  slotHeight: number;
  gap: number;
};

/** i 番目の箱の位置（メイン領域内の座標）。縦に並ぶ。 */
export function slotRect(o: SlotLayout, i: number): Rect {
  return {
    x: o.x + o.indexWidth,
    y: o.y + i * (o.slotHeight + o.gap),
    width: o.slotWidth,
    height: o.slotHeight,
  };
}

type SlotArrayProps = SlotLayout & {
  /** 箱ごとの出現 0〜1 */
  appear?: (i: number) => number;
  /** 箱ごとの強調 0〜1 と色 */
  glow?: (i: number) => number;
  glowColor?: (i: number) => string;
};

/** 番号付きの箱を縦に並べる（配列・ハッシュテーブルのバケット）。見た目だけの部品。 */
export const SlotArray = ({
  appear = () => 1,
  glow = () => 0,
  glowColor = () => theme.yellow,
  ...o
}: SlotArrayProps) => (
  <>
    {Array.from({ length: o.count }, (_, i) => {
      const r = slotRect(o, i);
      const a = appear(i);
      const g = glow(i);
      const c = glowColor(i);
      return (
        <div key={i} style={{ opacity: a }}>
          <div
            style={{
              position: "absolute",
              left: o.x,
              top: r.y,
              width: o.indexWidth - 16,
              height: r.height,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              fontFamily: theme.monoFamily,
              fontSize: Math.max(44, theme.minFontSize),
              fontWeight: 700,
              color: g > 0.5 ? c : theme.muted,
            }}
          >
            {i}
          </div>
          <div
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.width,
              height: r.height,
              boxSizing: "border-box",
              ...glowFrame(g, c),
              borderRadius: 14,
              transform: appearScale(a),
            }}
          />
        </div>
      );
    })}
  </>
);
