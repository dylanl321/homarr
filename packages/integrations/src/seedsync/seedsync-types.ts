import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

const SEEDSYNC_STATUS_PARSE_ERROR = "Invalid SeedSync status response";
const SEEDSYNC_MODEL_PARSE_ERROR = "Invalid SeedSync model response";

export const seedSyncFileStates = [
  "default",
  "queued",
  "downloading",
  "downloaded",
  "deleted",
  "extracting",
  "extracted",
  "extract_failed",
  "validating",
  "validated",
  "corrupt",
  "move_failed",
] as const;

export type SeedSyncFileState = (typeof seedSyncFileStates)[number];

const failedStates = new Set<SeedSyncFileState>(["extract_failed", "corrupt", "move_failed"]);
const completedStates = new Set<SeedSyncFileState>(["downloaded", "extracted", "validated"]);
const activeStates = new Set<SeedSyncFileState>(["queued", "downloading", "extracting", "validating"]);

export const seedSyncStatusSchema = z.object({
  server: z
    .object({
      up: z.boolean().optional(),
      error_msg: z.string().nullable().optional(),
    })
    .optional(),
  controller: z
    .object({
      latest_local_scan_time: z.string().nullable().optional(),
      latest_remote_scan_time: z.string().nullable().optional(),
      latest_remote_scan_failed: z.boolean().optional(),
      latest_remote_scan_error: z.string().nullable().optional(),
      no_enabled_pairs: z.boolean().optional(),
    })
    .optional(),
});

type SeedSyncModelFileRaw = {
  name: string;
  pair_id?: string | null;
  is_dir?: boolean;
  state?: SeedSyncFileState;
  remote_size?: number | null;
  local_size?: number | null;
  downloading_speed?: number | null;
  eta?: number | null;
  full_path?: string | null;
  children?: SeedSyncModelFileRaw[];
};

export type SeedSyncModelFile = {
  name: string;
  pairId: string | null;
  isDir: boolean;
  state: SeedSyncFileState;
  remoteSize: number | null;
  localSize: number | null;
  downloadingSpeed: number | null;
  eta: number | null;
  fullPath: string | null;
  children: SeedSyncModelFile[];
};

const seedSyncModelFileRawSchema: z.ZodType<SeedSyncModelFileRaw> = z.lazy(() =>
  z.object({
    name: z.string(),
    pair_id: z.string().nullable().optional(),
    is_dir: z.boolean().optional(),
    state: z.enum(seedSyncFileStates).optional(),
    remote_size: z.number().nullable().optional(),
    local_size: z.number().nullable().optional(),
    downloading_speed: z.number().nullable().optional(),
    eta: z.number().nullable().optional(),
    full_path: z.string().nullable().optional(),
    children: z.array(seedSyncModelFileRawSchema).optional(),
  }),
);

export const seedSyncModelSchema = z.array(seedSyncModelFileRawSchema);

const mapSeedSyncModelFile = (file: SeedSyncModelFileRaw): SeedSyncModelFile => ({
  name: file.name,
  pairId: file.pair_id ?? null,
  isDir: file.is_dir ?? false,
  state: file.state ?? "default",
  remoteSize: file.remote_size ?? null,
  localSize: file.local_size ?? null,
  downloadingSpeed: file.downloading_speed ?? null,
  eta: file.eta ?? null,
  fullPath: file.full_path ?? null,
  children: (file.children ?? []).map(mapSeedSyncModelFile),
});

const extractSeedSyncModelFiles = (json: unknown): unknown => {
  if (Array.isArray(json)) {
    return json;
  }
  if (json && typeof json === "object" && "files" in json) {
    return (json as { files: unknown }).files;
  }
  return json;
};

export interface SeedSyncTransfer {
  name: string;
  state: SeedSyncFileState;
  remoteSize: number | null;
  localSize: number | null;
  downloadingSpeed: number | null;
  eta: number | null;
  fullPath: string | null;
}

export interface SeedSyncDashboardData {
  serverUp: boolean;
  serverError: string | null;
  remoteScanFailed: boolean;
  queued: number;
  downloading: number;
  completed: number;
  failed: number;
  totalSpeed: number;
  remoteSize: number;
  localSize: number;
  transfers: SeedSyncTransfer[];
}

const parseJsonAsync = async (response: { json: () => Promise<unknown> }, message: string): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    throw new ParseError(message, {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
};

export const parseSeedSyncStatusResponseAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<z.infer<typeof seedSyncStatusSchema>> => {
  const json = await parseJsonAsync(response, SEEDSYNC_STATUS_PARSE_ERROR);
  const parsed = await seedSyncStatusSchema.safeParseAsync(json);
  if (!parsed.success) {
    throw new ParseError(SEEDSYNC_STATUS_PARSE_ERROR, { cause: parsed.error });
  }
  return parsed.data;
};

export const parseSeedSyncModelJson = (json: unknown): SeedSyncModelFile[] => {
  const parsed = seedSyncModelSchema.safeParse(extractSeedSyncModelFiles(json));
  if (!parsed.success) {
    throw new ParseError(SEEDSYNC_MODEL_PARSE_ERROR, { cause: parsed.error });
  }
  return parsed.data.map(mapSeedSyncModelFile);
};

export const parseSseEventData = (chunk: string, eventName: string): string | null => {
  const events = chunk.split(/\r?\n\r?\n/);
  for (const event of events) {
    let currentEvent = "message";
    const dataLines: string[] = [];
    for (const line of event.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (currentEvent === eventName && dataLines.length > 0) {
      return dataLines.join("\n");
    }
  }
  return null;
};

const flattenFiles = (files: SeedSyncModelFile[]): SeedSyncModelFile[] => {
  const result: SeedSyncModelFile[] = [];
  for (const file of files) {
    result.push(file);
    if (file.children.length > 0) {
      result.push(...flattenFiles(file.children));
    }
  }
  return result;
};

export const mapSeedSyncDashboard = (
  files: SeedSyncModelFile[],
  status?: z.infer<typeof seedSyncStatusSchema>,
): SeedSyncDashboardData => {
  const flattened = flattenFiles(files);
  const queued = flattened.filter((file) => file.state === "queued").length;
  const downloading = flattened.filter((file) => file.state === "downloading").length;
  const completed = flattened.filter((file) => completedStates.has(file.state)).length;
  const failed = flattened.filter((file) => failedStates.has(file.state)).length;
  const transfers = flattened
    .filter((file) => activeStates.has(file.state) || failedStates.has(file.state))
    .map((file) => ({
      name: file.name,
      state: file.state,
      remoteSize: file.remoteSize,
      localSize: file.localSize,
      downloadingSpeed: file.downloadingSpeed,
      eta: file.eta,
      fullPath: file.fullPath,
    }));

  return {
    serverUp: status?.server?.up ?? true,
    serverError: status?.server?.error_msg ?? null,
    remoteScanFailed: status?.controller?.latest_remote_scan_failed ?? false,
    queued,
    downloading,
    completed,
    failed,
    totalSpeed: flattened.reduce((sum, file) => sum + (file.downloadingSpeed ?? 0), 0),
    remoteSize: files.reduce((sum, file) => sum + (file.remoteSize ?? 0), 0),
    localSize: files.reduce((sum, file) => sum + (file.localSize ?? 0), 0),
    transfers,
  };
};
