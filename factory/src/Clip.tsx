import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clips } from "./generated/clips";
import { Subtitles } from "./subtitles/Subtitles";
import { theme } from "./theme";
import { TimingContext } from "./timing/TimingContext";

/** 音声合成のクレジット（VOICEVOX 利用規約で表記必須）。最後の約1.5秒に表示する。 */
const CREDIT = "VOICEVOX:ずんだもん";
const CREDIT_SECONDS = 1.5;

const Credit = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const from = durationInFrames - Math.round(fps * CREDIT_SECONDS);
  const opacity = interpolate(frame, [from, from + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 150,
        textAlign: "center",
        fontSize: 32,
        opacity: opacity * 0.8,
        color: theme.text,
      }}
    >
      {CREDIT}
    </div>
  );
};

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
        <Credit />
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
