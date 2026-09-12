import { z } from "zod";
import { isValidCpf } from "./cpf";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase().max(160),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => isValidCpf(v), { message: "CPF invalido" }),
  password: z
    .string()
    .min(8)
    .refine((v) => /\d/.test(v), { message: "A senha precisa conter um numero" }),
  deviceFingerprint: z.string().min(8).max(256),
  deviceName: z.string().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(160),
  password: z.string().min(1).max(200),
  deviceFingerprint: z.string().min(8).max(256),
  deviceName: z.string().min(1).max(120),
});

export const subscriptionUpdateSchema = z.object({
  extraScreensCount: z.number().int().min(0).max(3),
});

export const favoriteSchema = z.object({
  dramaId: z.uuid(),
});

export const watchProgressSchema = z.object({
  episodeId: z.uuid(),
  stoppedAtSeconds: z.number().int().min(0),
  isFinished: z.boolean().optional().default(false),
});

export const heartbeatSchema = z.object({
  episodeId: z.uuid(),
  deviceFingerprint: z.string().min(8).max(256),
});

export const deviceDisconnectSchema = z.object({
  deviceId: z.uuid(),
});

// -------------------------------------------------------------
// Contrato do JSON Extractor (secao 3.1 da especificacao)
// -------------------------------------------------------------

const subtitleContractSchema = z.object({
  language: z.string().min(2).max(10),
  url: z.url(),
});

const episodeContractSchema = z.object({
  episode_number: z.number().int().min(1),
  title: z.string().max(300).optional(),
  duration_seconds: z.number().int().min(1).optional(),
  manifest_url: z.url(),
  format: z.enum(["HLS", "DASH", "MP4"]),
  headers_required: z.record(z.string(), z.string()).optional(),
  subtitles: z.array(subtitleContractSchema).optional().default([]),
});

const dramaContractSchema = z.object({
  title_portuguese: z.string().min(1).max(300),
  title_original: z.string().max(300).optional(),
  country_origin: z.enum(["KR", "CN", "JP", "TW", "TH"]),
  release_year: z.number().int().min(1900).max(2100),
  synopsis: z.string().min(1),
  poster_url: z.url(),
  banner_url: z.url(),
  genres: z.array(z.string()).default([]),
});

export const ingestContractSchema = z.object({
  provider_id: z.string().min(1).max(120),
  extracted_at: z.iso.datetime().optional(),
  drama: dramaContractSchema,
  episodes: z.array(episodeContractSchema).min(1),
});

export type IngestContract = z.infer<typeof ingestContractSchema>;
