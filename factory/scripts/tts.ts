/**
 * パートごとに beats.yaml から音声（audio/*.wav）と timing.json を作る。
 * 使い方: pnpm tts 001 [パート id]   または   pnpm tts ../clip/001-db-index   （factory/ で実行）
 *   パートを省くと全パート。単一形式のクリップ（clip.yaml に parts が無い）はクリップ直下が 1 パート。
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
import {
  MAX_TOTAL_SECONDS,
  clipTimeline,
  readMeta,
  readSources,
  resolveParts,
  sha256,
  sourceHash,
  validateParts,
  type PartRef,
} from "./lib/clip.ts";
import { buildReading, type Dict } from "./lib/reading.ts";
import { beatsFileSchema } from "./lib/schema.ts";
import { buildTimeline, type BeatInput } from "./lib/timeline.ts";
import { VOICEVOX_URL, createVoicevox } from "./lib/tts/voicevox.ts";
import type { TtsProvider } from "./lib/tts/provider.ts";
import { wavDurationSec } from "./lib/wav.ts";

const TOOL = "tts";
const loadDict = (text: string): Dict => (text ? ((parse(text) as Dict | null) ?? {}) : {});

const [clipArg, partArg] = cliArgs();
const clip = clipFromArg(TOOL, clipArg);
const meta = readMeta(clip.dir);
const partErrors = validateParts(clip.dir, meta);
if (partErrors.length > 0) fail(TOOL, `clip.yaml の parts が不正です\n${partErrors.map((e) => `  - ${e}`).join("\n")}`);
const allParts = resolveParts(clip, meta);
const parts = partArg ? allParts.filter((p) => p.id === partArg) : allParts;
if (parts.length === 0) fail(TOOL, `パート "${partArg}" はありません（あるもの: ${allParts.map((p) => p.id).join(", ")}）`);

async function ttsPart(part: PartRef): Promise<void> {
  const label = part.legacy ? clip.id : `${clip.id}/${part.rel}`;
  if (!existsSync(path.join(part.dir, "beats.yaml"))) fail(TOOL, `${label}/beats.yaml がありません`);
  const sources = readSources(part.dir, clip.dir);
  const parsed = beatsFileSchema.safeParse(parse(sources.beats));
  if (!parsed.success) {
    fail(
      TOOL,
      `${label}/beats.yaml が不正です\n` +
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

  const audioDir = path.join(part.dir, "audio");
  const cacheDir = path.join(audioDir, ".cache");
  mkdirSync(cacheDir, { recursive: true });

  if (!part.legacy) console.log(`--- ${part.id}（${part.role}）`);
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
  writeFileSync(path.join(part.dir, "timing.json"), JSON.stringify(timing, null, 2) + "\n");
  if (!part.legacy) console.log(`${part.id}: ${(timing.durationInFrames / timing.fps).toFixed(1)} 秒`);
}

for (const part of parts) await ttsPart(part);

const total = clipTimeline(allParts);
const sec = total.durationInFrames / total.fps;
console.log(`\ntts: ${clip.id} 総尺 ${sec.toFixed(1)} 秒（${total.durationInFrames} フレーム）`);
const missing = total.parts.filter((p) => p.timing === null).map((p) => p.part.id);
if (missing.length > 0) console.warn(`警告: timing.json が無いパートがあります（${missing.join(", ")}）。総尺に含めていません`);
if (sec > MAX_TOTAL_SECONDS) console.warn(`警告: 上限 ${MAX_TOTAL_SECONDS} 秒を超えています`);
