import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { clips } from "./generated/clips";
import { Subtitles } from "./subtitles/Subtitles";
import { theme } from "./theme";
import { TimingContext } from "./timing/TimingContext";

export type ClipProps = { clipId: string };

/** 共通の枠：背景 ＋ TimingContext ＋ Scene ＋ 音声 ＋ 字幕。 */
export const Clip = ({ clipId }: ClipProps) => {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) throw new Error(`Clip: "${clipId}" は登録されていません`);
  const { Scene, timing, audio } = clip;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.fontFamily, color: theme.text }}>
      <TimingContext.Provider value={timing}>
        <Scene />
        <Subtitles timing={timing} />
      </TimingContext.Provider>
      {timing.beats.map((b) =>
        audio[b.id] ? (
          <Sequence key={b.id} from={b.startFrame} durationInFrames={b.audioFrames}>
            <Audio src={staticFile(audio[b.id])} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
};
