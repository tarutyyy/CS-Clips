import { spawnSync } from "node:child_process";

const TARGET = { i: -14, tp: -1.5, lra: 11 };

type Measured = {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
};

function ffmpeg(args: string[]) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { encoding: "utf8" });
  if (r.error) throw new Error(`ffmpeg を起動できません: ${r.error.message}`);
  return r;
}

/** loudnorm の 2 パス処理。映像は再エンコードせず、音声だけ -14 LUFS にそろえる。 */
export function normalizeLoudness(input: string, output: string): { before: number; after: number } {
  const base = `loudnorm=I=${TARGET.i}:TP=${TARGET.tp}:LRA=${TARGET.lra}`;

  const pass1 = ffmpeg(["-i", input, "-vn", "-af", `${base}:print_format=json`, "-f", "null", "-"]);
  if (pass1.status !== 0) throw new Error(`音量の測定に失敗しました\n${pass1.stderr.slice(-800)}`);
  const m = pass1.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/);
  if (!m) throw new Error("音量の測定結果を読み取れませんでした（音声トラックがない可能性）");
  const measured = JSON.parse(m[0]) as Measured;

  const filter =
    `${base}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}` +
    `:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}` +
    `:offset=${measured.target_offset}:linear=true`;
  const pass2 = ffmpeg([
    "-i", input, "-c:v", "copy", "-af", filter,
    "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output,
  ]);
  if (pass2.status !== 0) throw new Error(`音量の調整に失敗しました\n${pass2.stderr.slice(-800)}`);
  return { before: Number(measured.input_i), after: TARGET.i };
}
