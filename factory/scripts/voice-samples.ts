/**
 * 話者の聞き比べ用に、同じ文を複数の話者で読み上げた wav を作る。
 * 使い方: pnpm voice-samples   （VOICEVOX が起動していること）
 * 出力: factory/.cache/voice-samples/<話者ID>-<名前>.wav  （git 管理しない）
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = process.env.VOICEVOX_URL ?? "http://localhost:50021";
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

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../.cache/voice-samples");
mkdirSync(outDir, { recursive: true });

async function post(url: string, init?: RequestInit) {
  const res = await fetch(url, { method: "POST", ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res;
}

for (const c of CANDIDATES) {
  const q = await post(
    `${ENGINE}/audio_query?speaker=${c.id}&text=${encodeURIComponent(TEXT)}`,
  );
  const query = (await q.json()) as Record<string, unknown>;
  query.speedScale = SPEED;
  query.outputSamplingRate = 48000;
  const s = await post(`${ENGINE}/synthesis?speaker=${c.id}`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  const file = path.join(outDir, `${String(c.id).padStart(3, "0")}-${c.name}.wav`);
  writeFileSync(file, Buffer.from(await s.arrayBuffer()));
  console.log(`ok  ${c.id}\t${c.name}`);
}
console.log(`\n出力先: ${outDir}`);
