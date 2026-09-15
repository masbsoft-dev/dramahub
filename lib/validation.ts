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

// Drama.id e so String @id @default(uuid()) — nao um formato UUID garantido
// em runtime (o seed usa ids curtos deterministicos tipo "seed-drama-0" para
// ficar idempotente). Validar como z.uuid() aqui rejeitaria toda interacao
// (favoritar, curtir) com o catalogo semente.
const dramaIdSchema = z.string().trim().min(1).max(64);

export const favoriteSchema = z.object({
  dramaId: dramaIdSchema,
});

export const dramaReactionSchema = z.object({
  dramaId: dramaIdSchema,
  type: z.enum(["LIKE", "DISLIKE"]),
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

// -------------------------------------------------------------
// Admin — catalogo (dramas/episodios/generos)
// -------------------------------------------------------------

export const adminDramaSchema = z.object({
  titlePortuguese: z.string().trim().min(1).max(300),
  titleOriginal: z.string().trim().max(300).optional().nullable(),
  synopsis: z.string().trim().min(1),
  countryOrigin: z.enum(["KR", "CN", "JP", "TW", "TH"]),
  releaseYear: z.number().int().min(1900).max(2100),
  // posterUrl/bannerUrl aceitam tanto URL real quanto gradiente CSS placeholder
  // (ver lib/poster.ts) — por isso nao validamos como z.url() aqui.
  posterUrl: z.string().trim().min(1).max(2000),
  bannerUrl: z.string().trim().min(1).max(2000),
  rating: z.number().min(0).max(10).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  genreIds: z.array(z.uuid()).default([]),
});

const subtitleInputSchema = z.object({
  language: z.string().trim().min(2).max(10),
  url: z.string().trim().min(1).max(2000),
});

export const adminEpisodeSchema = z.object({
  episodeNumber: z.number().int().min(1),
  title: z.string().trim().max(300).optional().nullable(),
  posterUrl: z.string().trim().max(2000).optional().nullable(),
  manifestUrl: z.string().trim().min(1).max(2000),
  format: z.enum(["HLS", "MP4", "DASH"]).optional(),
  headersJson: z.record(z.string(), z.string()).optional().nullable(),
  durationSeconds: z.number().int().min(1).optional().nullable(),
  subtitles: z.array(subtitleInputSchema).default([]),
});

export const probeDurationSchema = z.object({
  manifestUrl: z.string().trim().min(1).max(2000),
  format: z.enum(["HLS", "MP4", "DASH"]),
  headersJson: z.record(z.string(), z.string()).optional().nullable(),
});

export const adminGenreSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const adminSeasonSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  posterUrl: z.string().trim().max(2000).optional().nullable(),
  synopsis: z.string().trim().optional().nullable(),
});

export const adminCastMemberSchema = z.object({
  actorName: z.string().trim().min(1).max(150),
  roleName: z.string().trim().max(150).optional().nullable(),
  photoUrl: z.string().trim().max(2000).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const adminSoundtrackTrackSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artistName: z.string().trim().max(150).optional().nullable(),
  audioUrl: z.string().trim().max(2000).optional().nullable(),
  durationSeconds: z.number().int().min(1).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

// -------------------------------------------------------------
// Admin — importacao de playlist M3U
// -------------------------------------------------------------

export const playlistImportCreateSchema = z
  .object({
    sourceLabel: z.string().trim().min(1).max(200),
    url: z.url().optional(),
    content: z.string().min(1).max(20_000_000).optional(),
  })
  .refine((v) => !!v.url || !!v.content, {
    message: "Informe uma URL ou o conteudo do arquivo M3U",
  });

export const playlistImportPublishSchema = z.object({
  itemIds: z.array(z.uuid()).min(1),
});

export const playlistImportItemUpdateSchema = z.object({
  kind: z.enum(["CHANNEL", "MOVIE", "SERIES", "UNKNOWN"]).optional(),
  status: z.enum(["PENDING", "IMPORTED", "SKIPPED"]).optional(),
});
