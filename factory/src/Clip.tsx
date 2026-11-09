import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clips, type PartEntry } from "./generated/clips";
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
        bottom: theme.credit.bottom,
        textAlign: "center",
        fontSize: theme.credit.fontSize,
        opacity: opacity * theme.credit.opacity,
        color: theme.text,
      }}
    >
      {CREDIT}
    </div>
  );
};

/** クリップ全体の尺（パートの合計） */
export const clipDuration = (parts: PartEntry[]) => parts.reduce((n, p) => n + p.timing.durationInFrames, 0);

/** 1 パート：TimingContext をそのパートの timing に差し替え、Scene・字幕・音声を描く。継ぎ目はフェードで隠す。 */
const PartView = ({ part, fadeIn, fadeOut }: { part: PartEntry; fadeIn: boolean; fadeOut: boolean }) => {
  // <Sequence> の内側なので、frame はパートの頭からのフレーム（useBeat も同じ）
  const frame = useCurrentFrame();
  const { timing, audio, Scene } = part;
  const fade = Math.round(timing.fps * theme.partFadeSeconds);
  const dur = timing.durationInFrames;
  const opacity = Math.min(
    fadeIn ? interpolate(frame, [0, fade], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1,
    fadeOut ? interpolate(frame, [dur - fade, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1,
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity }}>
        <TimingContext.Provider value={timing}>
          <Scene />
          <Subtitles timing={timing} />
        </TimingContext.Provider>
      </AbsoluteFill>
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

export type ClipProps = { clipId: string };

/** 共通の枠：背景 ＋ パートの並び（Scene・字幕・音声）＋ クレジット。仕様書 §7、設計書 D13 */
export const Clip = ({ clipId }: ClipProps) => {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) throw new Error(`Clip: "${clipId}" は登録されていません`);
  let from = 0;
  const last = clip.parts.length - 1;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.fontFamily, color: theme.text }}>
      {clip.parts.map((part, i) => {
        const start = from;
        from += part.timing.durationInFrames;
        return (
          <Sequence key={part.id} from={start} durationInFrames={part.timing.durationInFrames}>
            <PartView part={part} fadeIn={i > 0} fadeOut={i < last} />
          </Sequence>
        );
      })}
      <Credit />
    </AbsoluteFill>
  );
};
