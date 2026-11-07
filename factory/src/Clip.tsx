import { AbsoluteFill } from "remotion";
import { clips } from "./generated/clips";
import { theme } from "./theme";
import { TimingContext } from "./timing/TimingContext";

export type ClipProps = { clipId: string };

/** 共通の枠：背景 ＋ TimingContext ＋ Scene。音声と字幕は tts 実装後に足す。 */
export const Clip = ({ clipId }: ClipProps) => {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) throw new Error(`Clip: "${clipId}" は登録されていません`);
  const { Scene, timing } = clip;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.fontFamily, color: theme.text }}>
      <TimingContext.Provider value={timing}>
        <Scene />
      </TimingContext.Provider>
    </AbsoluteFill>
  );
};
