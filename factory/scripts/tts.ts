/**
 * beats.yaml から音声（audio/*.wav）と timing.json を作る。
 * 使い方: pnpm tts 001   または   pnpm tts ../clip/001-db-index   （factory/ で実行）
 * 読み書きするのは、指定したクリップのディレクトリと factory/dict.yaml だけ。
 */
import { createHash } from "node:crypto";
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
import { factoryDir, resolveClip } from "./lib/clip.ts";
import { buildReading, type Dict } from "./lib/reading.ts";
import { beatsFileSchema } from "./lib/schema.ts";
import { buildTimeline, type BeatInput } from "./lib/timeline.ts";
import { createVoicevox } from "./lib/tts/voicevox.ts";
import type { TtsProvider } from "./lib/tts/provider.ts";
import { wavDurationSec } from "./lib/wav.ts";

const FPS = 30;
const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const readIfExists = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const loadDict = (text: string): Dict => (text ? ((parse(text) as Dict | null) ?? {}) : {});

function fail(msg: string): never {
  console.error(`tts: ${msg}`);
  process.exit(1);
}

const arg = process.argv.slice(2).filter((a) => a !== "--")[0];
if (!arg) fail("クリップを指定してください（例: pnpm tts 001）");

const clip = (() => {
  try {
    return resolveClip(arg);
  } catch (e) {
    return fail((e as Error).message);
  }
})();

const beatsPath = path.join(clip.dir, "beats.yaml");
if (!existsSync(beatsPath)) fail(`${clip.id}/beats.yaml がありません`);
const beatsRaw = readFileSync(beatsPath, "utf8");
const parsed = beatsFileSchema.safeParse(parse(beatsRaw));
if (!parsed.success) {
  fail(
    `beats.yaml が不正です\n` +
      parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"),
  );
}
const file = parsed.data;

const commonRaw = readIfExists(path.join(factoryDir, "dict.yaml"));
const clipRaw = readIfExists(path.join(clip.dir, "dict.yaml"));
const commonDict = loadDict(commonRaw);
const clipDict = loadDict(clipRaw);

const engineUrl = process.env.VOICEVOX_URL ?? "http://localhost:50021";
const provider: TtsProvider =
  file.voice.provider === "voicevox"
    ? createVoicevox(engineUrl)
    : fail(`provider "${file.voice.provider}" は未実装です`);

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
  fps: FPS,
  leadIn: file.timing.leadIn,
  tail: file.timing.tail,
});
const timing = {
  fps: timeline.fps,
  durationInFrames: timeline.durationInFrames,
  sourceHash: sha256(beatsRaw + "\n--\n" + commonRaw + "\n--\n" + clipRaw),
  beats: timeline.beats,
};
writeFileSync(path.join(clip.dir, "timing.json"), JSON.stringify(timing, null, 2) + "\n");

const sec = timing.durationInFrames / FPS;
console.log(`\ntts: ${clip.id} 総尺 ${sec.toFixed(1)} 秒（${timing.durationInFrames} フレーム）`);
if (sec > 60) console.warn("警告: 60 秒を超えています");
