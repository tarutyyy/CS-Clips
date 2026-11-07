import { theme } from "../theme";
import type { Rect } from "../geometry";
import { Arrow } from "./Arrow";

export type BTreeLevel = {
  /** この段のノード数。下の段の数は、この数で割り切れること */
  count: number;
  width: number;
  height: number;
  /** ノードの上端（メイン領域内） */
  y: number;
  /** ノードの中に描く目印（キー）の枠の数。0 なら枠だけ */
  keys?: number;
};

/** level 段目の index 番目のノードの位置（メイン領域内の座標）。 */
export function btreeNodeRect(
  levels: BTreeLevel[],
  areaWidth: number,
  level: number,
  index: number,
): Rect {
  const l = levels[level];
  const cx = ((index + 0.5) * areaWidth) / l.count;
  return { x: cx - l.width / 2, y: l.y, width: l.width, height: l.height };
}

type BTreeViewProps = {
  levels: BTreeLevel[];
  areaWidth?: number;
  /** 段ごとの出現 0〜1 */
  nodeProgress: number[];
  /** 段 l と l+1 の間の線の伸び 0〜1 */
  edgeProgress: number[];
  /** ノードの強調 0〜1（level, index） */
  nodeGlow?: (level: number, index: number) => number;
  /** 線の強調 0〜1（親の段 level, 子の index） */
  edgeGlow?: (level: number, childIndex: number) => number;
  /** ノードの拡大率（level, index） */
  nodeScale?: (level: number, index: number) => number;
};

/** B+木の見た目。段・ノード数・強調はすべて呼び出し側が渡す。 */
export const BTreeView = ({
  levels,
  areaWidth = theme.safe.width,
  nodeProgress,
  edgeProgress,
  nodeGlow = () => 0,
  edgeGlow = () => 0,
  nodeScale = () => 1,
}: BTreeViewProps) => (
  <>
    {levels.slice(1).map((child, l) => {
      const per = child.count / levels[l].count;
      return Array.from({ length: child.count }, (_, c) => {
        const parent = btreeNodeRect(levels, areaWidth, l, Math.floor(c / per));
        const kid = btreeNodeRect(levels, areaWidth, l + 1, c);
        const g = edgeGlow(l, c);
        return (
          <Arrow
            key={`e-${l}-${c}`}
            from={{ x: parent.x + parent.width / 2, y: parent.y + parent.height }}
            to={{ x: kid.x + kid.width / 2, y: kid.y }}
            progress={edgeProgress[l] ?? 0}
            color={g > 0.5 ? theme.yellow : theme.muted}
            width={g > 0.5 ? 7 : 3}
            head={false}
          />
        );
      });
    })}
    {levels.map((lv, l) =>
      Array.from({ length: lv.count }, (_, k) => {
        const r = btreeNodeRect(levels, areaWidth, l, k);
        const g = nodeGlow(l, k);
        const p = nodeProgress[l] ?? 0;
        return (
          <div
            key={`n-${l}-${k}`}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.width,
              height: r.height,
              boxSizing: "border-box",
              border: `4px solid ${g > 0.5 ? theme.yellow : theme.muted}`,
              borderRadius: 14,
              boxShadow: g > 0 ? `0 0 ${28 * g}px ${theme.yellow}` : undefined,
              opacity: p,
              transform: `scale(${(0.92 + 0.08 * p) * nodeScale(l, k)})`,
              display: "flex",
            }}
          >
            {Array.from({ length: lv.keys ?? 0 }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRight: i < (lv.keys ?? 0) - 1 ? `3px solid ${theme.muted}` : undefined,
                }}
              />
            ))}
          </div>
        );
      }),
    )}
  </>
);
