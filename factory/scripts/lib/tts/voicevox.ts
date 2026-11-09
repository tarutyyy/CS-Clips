import type { TtsProvider } from "./provider.ts";

/** VOICEVOX Engine の URL。環境変数 VOICEVOX_URL で変えられる。 */
export const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://localhost:50021";

export function createVoicevox(baseUrl: string): TtsProvider {
  const post = async (url: string, init?: RequestInit) => {
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", ...init });
    } catch {
      throw new Error(
        `VOICEVOX Engine に接続できません (${baseUrl})。factory/ で docker compose up -d を実行してください`,
      );
    }
    if (!res.ok) throw new Error(`VOICEVOX ${res.status} ${res.statusText}: ${url}`);
    return res;
  };

  return {
    name: "voicevox",
    async synthesize({ text, voice }) {
      const q = await post(
        `${baseUrl}/audio_query?speaker=${voice.speaker}&text=${encodeURIComponent(text)}`,
      );
      const query = (await q.json()) as Record<string, unknown>;
      query.speedScale = voice.speed;
      query.pitchScale = voice.pitch;
      query.intonationScale = voice.intonation;
      query.outputSamplingRate = 48000;
      query.outputStereo = false;
      const s = await post(`${baseUrl}/synthesis?speaker=${voice.speaker}`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });
      return { wav: Buffer.from(await s.arrayBuffer()) };
    },
  };
}
