import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import type { Timing } from "../timing/types";

/** 字幕の表示位置：セーフエリアの下（y 1380〜1700）。仕様書 §6 */
const BOX = { top: 1400, height: 300 } as const;
const FONT_SIZE = 56;

/** `**強調**` を黄色にして描く */
const renderRich = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: theme.yellow }}>{part.slice(2, -2)}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

export const Subtitles = ({ timing }: { timing: Timing }) => {
  const frame = useCurrentFrame();
  const active = timing.beats
    .flatMap((b) => b.subtitles ?? [])
    .find((s) => frame >= s.startFrame && frame < s.endFrame);
  if (!active) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: theme.safe.x,
        width: theme.safe.width,
        top: BOX.top,
        height: BOX.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: FONT_SIZE,
        fontWeight: 700,
        lineHeight: 1.4,
        color: theme.text,
        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
      }}
    >
      <div>{renderRich(active.text)}</div>
    </div>
  );
};
