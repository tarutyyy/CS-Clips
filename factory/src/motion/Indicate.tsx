import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

/** at から duration フレームかけて 0→1→0 と一度だけ脈打つ値。範囲外は 0。 */
export function pulse(frame: number, { at, duration = 20 }: { at: number; duration?: number }): number {
  const t = (frame - at) / duration;
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(Math.PI * t);
}

type IndicateProps = { at: number; duration?: number; scale?: number; children: ReactNode };

/** 中身を一度だけ膨らませて注目させる。 */
export const Indicate = ({ at, duration = 20, scale = 1.15, children }: IndicateProps) => {
  const frame = useCurrentFrame();
  const s = 1 + (scale - 1) * pulse(frame, { at, duration });
  return (
    <div style={{ display: "inline-block", transform: `scale(${s})`, transformOrigin: "center" }}>
      {children}
    </div>
  );
};
