/** timing.json の形（仕様書 §3.6）。tts が生成する。 */
export type Subtitle = { text: string; startFrame: number; endFrame: number };

export type BeatTiming = {
  id: string;
  startFrame: number;
  endFrame: number;
  audioFrames: number;
  audio?: string;
  subtitles?: Subtitle[];
};

export type Timing = {
  fps: number;
  durationInFrames: number;
  sourceHash?: string;
  beats: BeatTiming[];
};
