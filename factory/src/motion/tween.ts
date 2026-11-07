import { easeInOut, type Easing } from "./easing";

export type TweenOptions = {
  from: number;
  to: number;
  /** 開始フレーム */
  start: number;
  /** 長さ(フレーム) */
  duration: number;
  easing?: Easing;
};

/** frame の純関数。start 前は from、start+duration 以降は to を返す。 */
export function tween(frame: number, o: TweenOptions): number {
  const { from, to, start, duration, easing = easeInOut } = o;
  if (duration <= 0) return frame >= start ? to : from;
  const t = Math.min(1, Math.max(0, (frame - start) / duration));
  return from + (to - from) * easing(t);
}
