import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import type { Timing } from "../timing/types";

const PUNCT = /^[、。，．！？!?）」』】〕…ー]+$/;

/** 前の語にくっつける助詞・助動詞（文節の頭にならないもの） */
const ATTACH = /^(?:から|まで|より|だけ|しか|ほど|など|ので|のに|です|ます|でした|ました|ない|たい|ている|ています|ていた|てい|ました|ません|でした|[をはがにでとものへやかてしいるた])+$/;

/**
 * 日本語を文節に区切る。Intl.Segmenter の単語に分けたあと、
 * 句読点と助詞（「箱」＋「を」など）を直前の語にくっつけ、行頭や文節の途中で折り返さないようにする。
 */
export const segmentJa = (text: string): string[] => {
  // lib の型に Intl.Segmenter がない設定でも通るよう any 経由で使う
  const Seg = (Intl as any).Segmenter;
  if (!Seg) return Array.from(text);
  const out: string[] = [];
  for (const { segment } of new Seg("ja", { granularity: "word" }).segment(text) as Iterable<{ segment: string }>) {
    if (out.length > 0 && (PUNCT.test(segment) || ATTACH.test(segment))) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
};

/**
 * 文節の途中では改行しない（文節ごとに inline-block にする）。
 * 空白だけの区切り（英語の語間、例: Domain Name System）は inline-block にすると幅 0 に潰れるので、
 * そのまま文字として置く（そこで折り返してよい）。
 */
const words = (text: string, color?: string) =>
  segmentJa(text).map((w, i) =>
    /^\s+$/.test(w) ? (
      <span key={i} style={{ color }}>{" "}</span>
    ) : (
      <span key={i} style={{ display: "inline-block", color }}>{w}</span>
    ),
  );

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
        left: theme.subtitle.x,
        width: theme.subtitle.width,
        top: theme.subtitle.top,
        height: theme.subtitle.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: theme.subtitle.fontSize,
        fontWeight: 700,
        lineHeight: theme.subtitle.lineHeight,
        color: theme.text,
        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
      }}
    >
      <div>{renderRich(active.text)}</div>
    </div>
  );
};
