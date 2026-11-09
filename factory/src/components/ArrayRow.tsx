import { theme } from "../theme";
import { clamp01, type Rect } from "../geometry";
import { appearScale, glowFrame } from "./frame";

export type ArrayRowLayout = {
  count: number;
  /** 左端の箱の左上（メイン領域内の座標） */
  x: number;
  y: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
};

/** i 番目の箱の位置（メイン領域内の座標）。横に並ぶ。 */
export function arrayCellRect(o: ArrayRowLayout, i: number): Rect {
  return {
    x: o.x + i * (o.cellWidth + o.gap),
    y: o.y,
    width: o.cellWidth,
    height: o.cellHeight,
  };
}

type ArrayRowProps = Omit<ArrayRowLayout, "count"> & {
  /** 箱に入れる値。長さが箱の数になる */
  values: (string | number)[];
  size?: number;
  /** 箱ごとの出現 0〜1 */
  appear?: (i: number) => number;
  /** 箱ごとの強調 0〜1 と色 */
  glow?: (i: number) => number;
  glowColor?: (i: number) => string;
  /** 箱ごとの「候補から外れた」度合い 0〜1。暗くなる */
  dim?: (i: number) => number;
};

/** 値の入った箱を横一列に並べる（配列・探索の範囲）。見た目だけの部品。 */
export const ArrayRow = ({
  values,
  size = theme.minFontSize,
  appear = () => 1,
  glow = () => 0,
  glowColor = () => theme.yellow,
  dim = () => 0,
  ...o
}: ArrayRowProps) => (
  <>
    {values.map((v, i) => {
      const r = arrayCellRect({ ...o, count: values.length }, i);
      const a = appear(i);
      const g = glow(i);
      const c = glowColor(i);
      const d = clamp01(dim(i));
      const lit = g > 0.5;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: r.width,
            height: r.height,
            boxSizing: "border-box",
            ...glowFrame(g, c),
            borderRadius: 10,
            background: lit ? `${c}33` : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: theme.monoFamily,
            fontSize: Math.max(size, theme.minFontSize),
            fontWeight: 700,
            letterSpacing: -2,
            color: lit ? c : theme.text,
            opacity: a * (1 - 0.8 * d),
            transform: appearScale(a),
          }}
        >
          {v}
        </div>
      );
    })}
  </>
);
