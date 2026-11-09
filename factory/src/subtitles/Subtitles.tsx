import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import type { Timing } from "../timing/types";

const PUNCT = /^[、。，．！？!?）」』】〕…ー]+$/;

/** 日本語を単語に区切る。句読点などは直前の語にくっつけ、行頭に来ないようにする。 */
const segmentJa = (text: string): string[] => {
  // lib の型に Intl.Segmenter がない設定でも通るよう any 経由で使う
  const Seg = (Intl as any).Segmenter;
  if (!Seg) return Array.from(text);
  const out: string[] = [];
  for (const { segment } of new Seg("ja", { granularity: "word" }).segment(text) as Iterable<{ segment: string }>) {
    if (out.length > 0 && PUNCT.test(segment)) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
};

/** 単語の途中では改行しない（単語ごとに inline-block にする） */
const words = (text: string, color?: string) =>
  segmentJa(text).map((w, i) => (
    <span key={i} style={{ display: "inline-block", color }}>{w}</span>
  ));

/** `**強調**` を黄色にして描く */
const renderRich = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i}>{words(part.slice(2, -2), theme.yellow)}</span>
    ) : (
      <span key={i}>{words(part)}</span>
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
        top: theme.subtitle.top,
        height: theme.subtitle.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: theme.subtitle.fontSize,
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
