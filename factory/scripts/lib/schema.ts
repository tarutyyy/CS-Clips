import { z } from "zod";

export const voiceSchema = z.object({
  provider: z.enum(["voicevox", "aivis"]),
  speaker: z.number().int().nonnegative(),
  speed: z.number().positive().default(1.1),
  pitch: z.number().default(0),
  intonation: z.number().positive().default(1),
});

export const timingConfigSchema = z
  .object({
    leadIn: z.number().nonnegative().default(0.3),
    gap: z.number().nonnegative().default(0.25),
    tail: z.number().nonnegative().default(1),
  })
  .default({});

export const beatSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, "id は英小文字・数字・ハイフンだけ"),
    text: z.string().default(""),
    yomi: z.string().optional(),
    subtitle: z.string().optional(),
    gap: z.number().nonnegative().optional(),
    silence: z.number().positive().optional(),
  })
  .refine((b) => b.silence !== undefined || b.text.trim() !== "", {
    message: "text が空です（silence ビート以外は必須）",
  });

export const beatsFileSchema = z
  .object({
    voice: voiceSchema,
    timing: timingConfigSchema,
    beats: z.array(beatSchema).min(1),
  })
  .superRefine((f, ctx) => {
    const seen = new Set<string>();
    f.beats.forEach((b, i) => {
      if (seen.has(b.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["beats", i, "id"],
          message: `id "${b.id}" が重複しています`,
        });
      }
      seen.add(b.id);
    });
  });

export type BeatsFile = z.infer<typeof beatsFileSchema>;
export type BeatSpec = BeatsFile["beats"][number];
export type VoiceConfig = z.infer<typeof voiceSchema>;
