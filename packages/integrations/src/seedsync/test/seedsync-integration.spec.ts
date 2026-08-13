// @vitest-environment node
import { ParseError } from "@homarr/common/server";
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { IntegrationParseError } from "../../base/errors/parse/integration-parse-error";
import type { IntegrationSecret } from "../../base/types";
import { SeedSyncIntegration } from "../seedsync-integration";
import { mapSeedSyncDashboard, parseSeedSyncModelJson, parseSseEventData } from "../seedsync-types";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://seedsync.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const sampleModel = [
  {
    name: "Show.S01E01",
    pair_id: "default",
    is_dir: true,
    state: "downloading",
    remote_size: 1000,
    local_size: 400,
    downloading_speed: 50,
    eta: 12,
    full_path: "/downloads/Show.S01E01",
    children: [],
  },
  {
    name: "Movie",
    pair_id: "default",
    is_dir: true,
    state: "queued",
    remote_size: 2000,
    local_size: 0,
    downloading_speed: 0,
    eta: null,
    full_path: "/downloads/Movie",
    children: [],
  },
  {
    name: "Done",
    pair_id: "default",
    is_dir: false,
    state: "downloaded",
    remote_size: 500,
    local_size: 500,
    downloading_speed: 0,
    eta: null,
    full_path: "/downloads/Done",
    children: [],
  },
  {
    name: "Bad",
    pair_id: "default",
    is_dir: false,
    state: "extract_failed",
    remote_size: 100,
    local_size: 100,
    downloading_speed: 0,
    eta: null,
    full_path: "/downloads/Bad",
    children: [],
  },
];

const createIntegration = (decryptedSecrets: IntegrationSecret[] = []) =>
  new SeedSyncIntegration({
    id: "test-seedsync",
    name: "Test SeedSync",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("mapSeedSyncDashboard", () => {
  test("counts queue, speeds, completed, failed, and storage from the model", () => {
    const dashboard = mapSeedSyncDashboard(
      [
        {
          name: "Show.S01E01",
          pairId: "default",
          isDir: true,
          state: "downloading",
          remoteSize: 1000,
          localSize: 400,
          downloadingSpeed: 50,
          eta: 12,
          fullPath: "/downloads/Show.S01E01",
          children: [],
        },
        {
          name: "Movie",
          pairId: "default",
          isDir: true,
          state: "queued",
          remoteSize: 2000,
          localSize: 0,
          downloadingSpeed: 0,
          eta: null,
          fullPath: "/downloads/Movie",
          children: [],
        },
        {
          name: "Done",
          pairId: "default",
          isDir: false,
          state: "downloaded",
          remoteSize: 500,
          localSize: 500,
          downloadingSpeed: 0,
          eta: null,
          fullPath: "/downloads/Done",
          children: [],
        },
        {
          name: "Bad",
          pairId: "default",
          isDir: false,
          state: "extract_failed",
          remoteSize: 100,
          localSize: 100,
          downloadingSpeed: 0,
          eta: null,
          fullPath: "/downloads/Bad",
          children: [],
        },
      ],
      { server: { up: true, error_msg: null } },
    );

    expect(dashboard).toMatchObject({
      queued: 1,
      downloading: 1,
      completed: 1,
      failed: 1,
      totalSpeed: 50,
      remoteSize: 3600,
      localSize: 1000,
    });
    expect(dashboard.transfers).toHaveLength(3);
  });
});

describe("parseSeedSyncModelJson", () => {
  test("maps a raw model-init array to camelCase files", () => {
    const files = parseSeedSyncModelJson(sampleModel);
    expect(files).toHaveLength(4);
    expect(files[0]).toMatchObject({
      name: "Show.S01E01",
      pairId: "default",
      isDir: true,
      state: "downloading",
      remoteSize: 1000,
      downloadingSpeed: 50,
    });
  });

  test("accepts a files wrapper from model-init", () => {
    const files = parseSeedSyncModelJson({ files: sampleModel });
    expect(files).toHaveLength(4);
  });
});

describe("parseSseEventData", () => {
  test("extracts model-init payload from an SSE snapshot", () => {
    const payload = parseSseEventData(`event: model-init\ndata: ${JSON.stringify(sampleModel)}\n\n`, "model-init");
    expect(payload).toBe(JSON.stringify(sampleModel));
  });
});

describe("SeedSyncIntegration getDashboardAsync", () => {
  test("loads status and the first SSE model snapshot", async () => {
    mockFetch.mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("/server/status")) {
        return new Response(JSON.stringify({ server: { up: true, error_msg: null }, controller: {} }), {
          status: 200,
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      }

      const body = `event: model-init\ndata: ${JSON.stringify(sampleModel)}\n\n`;
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
    });

    const dashboard = await createIntegration([{ kind: "apiKey", value: "secret" }]).getDashboardAsync();

    expect(dashboard.queued).toBe(1);
    expect(dashboard.downloading).toBe(1);
    expect(dashboard.failed).toBe(1);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: { "X-API-Key": "secret" },
    });
  });

  test("throws ParseError when the stream never emits model-init", async () => {
    mockFetch.mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("/server/status")) {
        return new Response(JSON.stringify({ server: { up: true } }), {
          status: 200,
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      }

      return new Response("event: heartbeat\ndata: {}\n\n", {
        status: 200,
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
    });

    await expect(createIntegration().getDashboardAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;
      return error.cause instanceof ParseError && error.cause.message.includes("model-init");
    });
  });
});

describe("SeedSyncIntegration testing endpoint", () => {
  type TestingFn = (input: IntegrationTestingInput) => Promise<{ success: boolean }>;

  const invokeTesting = (integration: SeedSyncIntegration, input: IntegrationTestingInput) => {
    const testing = (integration as unknown as { testingAsync: TestingFn }).testingAsync.bind(integration);
    return testing(input);
  };

  test("returns success when /server/status responds 200", async () => {
    const input = {
      fetchAsync: vi.fn().mockResolvedValue(new Response(JSON.stringify({ server: { up: true } }), { status: 200 })),
    } as unknown as IntegrationTestingInput;

    const result = await invokeTesting(createIntegration(), input);
    expect(result.success).toBe(true);
  });

  test("returns a status-code failure when /server/status is non-OK", async () => {
    const input = {
      fetchAsync: vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })),
    } as unknown as IntegrationTestingInput;

    const result = await invokeTesting(createIntegration(), input);
    expect(result.success).toBe(false);
  });
});
