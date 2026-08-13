// @vitest-environment node
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import type { IntegrationSecret } from "../../base/types";
import { DispatcharrIntegration } from "../dispatcharr-integration";
import { mapDispatcharrDashboard } from "../dispatcharr-types";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://dispatcharr.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = (decryptedSecrets: IntegrationSecret[] = [{ kind: "apiKey", value: "dispatch-key" }]) =>
  new DispatcharrIntegration({
    id: "test-dispatcharr",
    name: "Test Dispatcharr",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("mapDispatcharrDashboard", () => {
  test("maps keyed proxy sessions and paginated channel/stream counts", () => {
    const dashboard = mapDispatcharrDashboard({
      channels: { count: 42, results: [] },
      streams: { count: 80, results: [] },
      staleStreams: { count: 70, results: [] },
      proxyStatus: {
        "channel-1": {
          name: "CNN",
          clients: [{ ip: "10.0.0.2" }, { ip: "10.0.0.3" }],
          output_bitrate: 8_000_000,
          stream_id: 12,
        },
      },
    });

    expect(dashboard).toMatchObject({
      channelCount: 42,
      streamCount: 80,
      staleStreamCount: 10,
      activeSessions: 1,
      clientCount: 2,
    });
    expect(dashboard.sessions[0]).toMatchObject({
      id: "channel-1",
      name: "CNN",
      clientCount: 2,
      bitrate: 8_000_000,
    });
  });

  test("ignores non-object proxy status fields", () => {
    const dashboard = mapDispatcharrDashboard({
      channels: { count: 1 },
      streams: { count: 1 },
      proxyStatus: {
        ok: true,
        "channel-1": { name: "HBO", clients: [{}] },
      },
    });

    expect(dashboard.activeSessions).toBe(1);
    expect(dashboard.sessions[0]?.name).toBe("HBO");
  });
});

describe("DispatcharrIntegration getDashboardAsync", () => {
  test("fetches proxy status and summary endpoints with API key headers", async () => {
    mockFetch.mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("/proxy/ts/status")) {
        return new Response(JSON.stringify({ "ch-1": { name: "HBO", clients: [{}] } }), {
          status: 200,
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      }
      if (href.includes("hide_stale=true")) {
        return new Response(JSON.stringify({ count: 9, results: [] }), {
          status: 200,
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      }
      if (href.includes("/api/channels/streams/")) {
        return new Response(JSON.stringify({ count: 11, results: [] }), {
          status: 200,
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      }
      return new Response(JSON.stringify({ count: 5, results: [] }), {
        status: 200,
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
    });

    const dashboard = await createIntegration().getDashboardAsync();

    expect(dashboard.channelCount).toBe(5);
    expect(dashboard.streamCount).toBe(11);
    expect(dashboard.staleStreamCount).toBe(2);
    expect(dashboard.activeSessions).toBe(1);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        "X-API-Key": "dispatch-key",
        Authorization: "ApiKey dispatch-key",
      },
    });
  });
});

describe("DispatcharrIntegration testing endpoint", () => {
  type TestingFn = (input: IntegrationTestingInput) => Promise<{ success: boolean }>;

  const invokeTesting = (integration: DispatcharrIntegration, input: IntegrationTestingInput) => {
    const testing = (integration as unknown as { testingAsync: TestingFn }).testingAsync.bind(integration);
    return testing(input);
  };

  test("returns success when the channels endpoint responds 200", async () => {
    const input = {
      fetchAsync: vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 1, results: [] }), { status: 200 })),
    } as unknown as IntegrationTestingInput;

    const result = await invokeTesting(createIntegration(), input);
    expect(result.success).toBe(true);
  });

  test("returns a status-code failure when the channels endpoint is non-OK", async () => {
    const input = {
      fetchAsync: vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })),
    } as unknown as IntegrationTestingInput;

    const result = await invokeTesting(createIntegration(), input);
    expect(result.success).toBe(false);
  });
});
