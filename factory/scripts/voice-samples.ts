/**
 * 話者の聞き比べ用に、同じ文を複数の話者で読み上げた wav を作る。
 * 使い方: pnpm voice-samples   （VOICEVOX が起動していること）
 * 出力: factory/.cache/voice-samples/<話者ID>-<名前>.wav  （git 管理しない）
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { factoryDir } from "./lib/clip.ts";
import { VOICEVOX_URL, createVoicevox } from "./lib/tts/voicevox.ts";

const SPEED = 1.1;

// 解説動画向きになりそうな候補。{ id, 名前 }
const CANDIDATES = [
  { id: 13, name: "青山龍星-ノーマル" },
  { id: 11, name: "玄野武宏-ノーマル" },
  { id: 30, name: "No7-アナウンス" },
  { id: 8, name: "春日部つむぎ-ノーマル" },
  { id: 10, name: "雨晴はう-ノーマル" },
  { id: 14, name: "冥鳴ひまり-ノーマル" },
  { id: 2, name: "四国めたん-ノーマル" },
  { id: 3, name: "ずんだもん-ノーマル" },
];

// 解説で出てくる種類の文：数、用語の読み、少し長めの説明
const TEXT =
  "一億ぎょうのテーブルから、いちぎょうを探す。ビープラスぎなら、たった三回の比較で見つかります。" +
  "データが増えても、探す手間はほとんど増えません。";

const outDir = path.join(factoryDir, ".cache/voice-samples");
mkdirSync(outDir, { recursive: true });

const voicevox = createVoicevox(VOICEVOX_URL);
for (const c of CANDIDATES) {
  const { wav } = await voicevox.synthesize({
    text: TEXT,
    voice: { provider: "voicevox", speaker: c.id, speed: SPEED, pitch: 0, intonation: 1 },
  });
  const file = path.join(outDir, `${String(c.id).padStart(3, "0")}-${c.name}.wav`);
  writeFileSync(file, wav);
  console.log(`ok  ${c.id}\t${c.name}`);
}
console.log(`\n出力先: ${outDir}`);
