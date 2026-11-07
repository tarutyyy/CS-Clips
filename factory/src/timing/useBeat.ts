import { useContext } from "react";
import { useCurrentFrame } from "remotion";
import { linear, type Easing } from "../motion/easing";
import { tween } from "../motion/tween";
import { TimingContext } from "./TimingContext";

export type ProgressOptions = {
  /** ビート開始からのずらし(フレーム)。既定 0 */
  offset?: number;
  /** 長さ(フレーム)。既定はビートの音声の長さ */
  duration?: number;
  easing?: Easing;
};

export type Beat = {
  id: string;
  /** ビートの開始フレーム */
  start: number;
  /** ビートの終了フレーム */
  end: number;
  audioFrames: number;
  isActive: boolean;
  /** 0→1。範囲外は 0 / 1 に丸める */
  progress: (opts?: ProgressOptions) => number;
};

/**
 * ビートの時刻を取る。秒数を Scene に直書きしないための入口。
 * 注意: <Sequence> の内側で呼ぶと useCurrentFrame が相対フレームになる。
 * Scene はクリップ全体の絶対フレームで使うこと。
 */
export function useBeat(id: string): Beat {
  const timing = useContext(TimingContext);
  const frame = useCurrentFrame();
  if (!timing) {
    throw new Error("useBeat: TimingContext がありません（Clip の内側で使うこと）");
  }
  const beat = timing.beats.find((b) => b.id === id);
  if (!beat) {
    const known = timing.beats.map((b) => b.id).join(", ");
    throw new Error(`useBeat: ビート "${id}" は beats.yaml にありません（あるもの: ${known}）`);
  }
  const { startFrame: start, endFrame: end, audioFrames } = beat;
  return {
    id,
    start,
    end,
    audioFrames,
    isActive: frame >= start && frame < end,
    progress: ({ offset = 0, duration = audioFrames, easing = linear } = {}) =>
      tween(frame, { from: 0, to: 1, start: start + offset, duration, easing }),
  };
}
