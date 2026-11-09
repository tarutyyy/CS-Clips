/**
 * beats.yaml から音声（audio/*.wav）と timing.json を作る。
 * 使い方: pnpm tts 001   または   pnpm tts ../clip/001-db-index   （factory/ で実行）
 * 読み書きするのは、指定したクリップのディレクトリと factory/dict.yaml だけ。
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { theme } from "../src/theme.ts";
import { cliArgs, clipFromArg, fail } from "./lib/cli.ts";
import { MAX_SECONDS, readSources, sha256, sourceHash } from "./lib/clip.ts";
import { buildReading, type Dict } from "./lib/reading.ts";
import { beatsFileSchema } from "./lib/schema.ts";
import { buildTimeline, type BeatInput } from "./lib/timeline.ts";
import { VOICEVOX_URL, createVoicevox } from "./lib/tts/voicevox.ts";
import type { TtsProvider } from "./lib/tts/provider.ts";
import { wavDurationSec } from "./lib/wav.ts";

const TOOL = "tts";
const loadDict = (text: string): Dict => (text ? ((parse(text) as Dict | null) ?? {}) : {});

const clip = clipFromArg(TOOL, cliArgs()[0]);

if (!existsSync(path.join(clip.dir, "beats.yaml"))) fail(TOOL, `${clip.id}/beats.yaml がありません`);
const sources = readSources(clip.dir);
const parsed = beatsFileSchema.safeParse(parse(sources.beats));
if (!parsed.success) {
  fail(
    TOOL,
    `beats.yaml が不正です\n` +
      parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"),
  );
}
const file = parsed.data;

const commonDict = loadDict(sources.commonDict);
const clipDict = loadDict(sources.clipDict);

const provider: TtsProvider =
  file.voice.provider === "voicevox"
    ? createVoicevox(VOICEVOX_URL)
    : fail(TOOL, `provider "${file.voice.provider}" は未実装です`);

const audioDir = path.join(clip.dir, "audio");
const cacheDir = path.join(audioDir, ".cache");
mkdirSync(cacheDir, { recursive: true });

const inputs: BeatInput[] = [];
for (const beat of file.beats) {
  const gapSec = beat.gap ?? file.timing.gap;
  const subtitle = beat.subtitle ?? beat.text;

  if (beat.silence !== undefined) {
    inputs.push({ id: beat.id, audioSec: beat.silence, isSilence: true, gapSec, subtitle });
    console.log(`silence  ${beat.id}\t${beat.silence}s`);
    continue;
  }

  const reading = buildReading(beat, commonDict, clipDict);
  const key = sha256(JSON.stringify({ voice: file.voice, reading }));
  const cached = path.join(cacheDir, `${key}.wav`);
  let wav: Buffer;
  let how: string;
  if (existsSync(cached)) {
    wav = readFileSync(cached);
    how = "cache";
  } else {
    wav = (await provider.synthesize({ text: reading, voice: file.voice })).wav;
    writeFileSync(cached, wav);
    how = "synth";
  }
  copyFileSync(cached, path.join(audioDir, `${beat.id}.wav`));
  const audioSec = wavDurationSec(wav);
  inputs.push({
    id: beat.id,
    audioSec,
    isSilence: false,
    gapSec,
    subtitle,
    audio: `audio/${beat.id}.wav`,
  });
  console.log(`${how.padEnd(8)} ${beat.id}\t${audioSec.toFixed(2)}s\t${reading}`);
}

// beats.yaml にないビートの音声を消す
const keep = new Set(file.beats.filter((b) => b.silence === undefined).map((b) => `${b.id}.wav`));
for (const f of readdirSync(audioDir)) {
  if (f.endsWith(".wav") && !keep.has(f)) rmSync(path.join(audioDir, f));
}

const timeline = buildTimeline(inputs, {
  fps: theme.fps,
  leadIn: file.timing.leadIn,
  tail: file.timing.tail,
});
const timing = {
  fps: timeline.fps,
  durationInFrames: timeline.durationInFrames,
  sourceHash: sourceHash(sources),
  beats: timeline.beats,
};
writeFileSync(path.join(clip.dir, "timing.json"), JSON.stringify(timing, null, 2) + "\n");

const sec = timing.durationInFrames / timing.fps;
console.log(`\ntts: ${clip.id} 総尺 ${sec.toFixed(1)} 秒（${timing.durationInFrames} フレーム）`);
if (sec > MAX_SECONDS) console.warn(`警告: ${MAX_SECONDS} 秒を超えています`);
