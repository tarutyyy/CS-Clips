import { useCurrentFrame } from "remotion";
import { clamp01, type Point } from "../geometry";
import { easeInOut, linear, type Easing } from "./easing";
import { tween } from "./tween";

export type MorphOptions = { at: number; duration: number; easing?: Easing };

/**
 * 同じ物を、ある配置から別の配置へ変形させる。frame の純関数。
 * order(0〜1) と spread(0〜1 未満) を渡すと、order の大きいものほど遅れて動き出す。
 */
export function useMorph({ at, duration, easing = easeInOut }: MorphOptions) {
  const frame = useCurrentFrame();
  const raw = tween(frame, { from: 0, to: 1, start: at, duration, easing: linear });
  const local = (order = 0, spread = 0) =>
    easing(clamp01((raw - order * spread) / (1 - spread)));
  return {
    /** 全体の進み具合 0→1 */
    t: easing(raw),
    mix: (a: number, b: number, order = 0, spread = 0) => a + (b - a) * local(order, spread),
    point: (a: Point, b: Point, order = 0, spread = 0): Point => {
      const k = local(order, spread);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    },
  };
}
