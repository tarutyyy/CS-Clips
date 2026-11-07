import { theme } from "../theme";
import type { Point } from "../geometry";

type ArrowProps = {
  from: Point;
  to: Point;
  /** 0〜1。from から to へ線が伸びる割合 */
  progress?: number;
  color?: string;
  width?: number;
  head?: boolean;
};

/** メイン領域（SafeArea）内の座標で線（矢印）を引く。 */
export const Arrow = ({
  from,
  to,
  progress = 1,
  color = theme.muted,
  width = 4,
  head = true,
}: ArrowProps) => {
  if (progress <= 0) return null;
  const p = Math.min(1, progress);
  const ex = from.x + (to.x - from.x) * p;
  const ey = from.y + (to.y - from.y) * p;
  const angle = Math.atan2(ey - from.y, ex - from.x);
  const h = 22;
  const tip = `${ex},${ey}`;
  const left = `${ex - h * Math.cos(angle - 0.45)},${ey - h * Math.sin(angle - 0.45)}`;
  const right = `${ex - h * Math.cos(angle + 0.45)},${ey - h * Math.sin(angle + 0.45)}`;
  return (
    <svg
      width={theme.safe.width}
      height={theme.safe.height}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
    >
      <line x1={from.x} y1={from.y} x2={ex} y2={ey} stroke={color} strokeWidth={width} strokeLinecap="round" />
      {head && p > 0.05 ? <polygon points={`${tip} ${left} ${right}`} fill={color} /> : null}
    </svg>
  );
};
