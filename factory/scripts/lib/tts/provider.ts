import type { VoiceConfig } from "../schema.ts";

/** TTS の差し替え口（設計 D3）。今は VOICEVOX だけ。モーラ単位の時刻は未対応。 */
export interface TtsProvider {
  name: "voicevox" | "aivis";
  synthesize(input: { text: string; voice: VoiceConfig }): Promise<{ wav: Buffer }>;
}
