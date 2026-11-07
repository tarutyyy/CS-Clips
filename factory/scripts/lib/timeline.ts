import type { BeatTiming, Subtitle, Timing } from "../../src/timing/types.ts";
import { splitSubtitle, visibleLength } from "./subtitles.ts";

export type BeatInput = {
  id: string;
  /** 音声の長さ（秒）。silence ビートでは silence の秒数 */
  audioSec: number;
  isSilence: boolean;
  gapSec: number;
  subtitle: string;
  audio?: string;
};

export type TimelineConfig = { fps: number; leadIn: number; tail: number };

/** 字幕を、文字数に比例した長さで音声区間に割り当てる（最後の字幕はビート終端まで）。 */
export function allocateSubtitles(
  chunks: string[],
  start: number,
  audioFrames: number,
  end: number,
): Subtitle[] {
  const weights = chunks.map((c) => Math.max(1, visibleLength(c)));
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return chunks.map((text, i) => {
    const s = start + Math.round((audioFrames * acc) / total);
    acc += weights[i];
    const e = i === chunks.length - 1 ? end : start + Math.round((audioFrames * acc) / total);
    return { text, startFrame: s, endFrame: e };
  });
}

/**
 * ビートの開始・終了フレームを累積で決める（仕様書 §3.6）。
 * endFrame は音声の後の gap を含み、次のビートの startFrame と一致する。
 */
export function buildTimeline(
  inputs: BeatInput[],
  cfg: TimelineConfig,
): Pick<Timing, "fps" | "durationInFrames" | "beats"> {
  const { fps } = cfg;
  let cursor = Math.round(cfg.leadIn * fps);
  const beats: BeatTiming[] = inputs.map((b) => {
    const startFrame = cursor;
    const audioFrames = b.isSilence ? Math.round(b.audioSec * fps) : Math.ceil(b.audioSec * fps);
    const endFrame = startFrame + audioFrames + Math.round(b.gapSec * fps);
    cursor = endFrame;
    const chunks = splitSubtitle(b.subtitle);
    const beat: BeatTiming = { id: b.id, startFrame, audioFrames, endFrame };
    if (b.audio) beat.audio = b.audio;
    if (chunks.length > 0) beat.subtitles = allocateSubtitles(chunks, startFrame, audioFrames, endFrame);
    return beat;
  });
  return { fps, durationInFrames: cursor + Math.round(cfg.tail * fps), beats };
}
