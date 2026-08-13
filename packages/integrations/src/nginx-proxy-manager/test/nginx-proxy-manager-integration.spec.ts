// @vitest-environment node
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { NginxProxyManagerIntegration } from "../nginx-proxy-manager-integration";
import { mapNginxProxyManagerDashboard, parseNginxProxyManagerTokenAsync } from "../nginx-proxy-manager-types";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://npm.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = () =>
  new NginxProxyManagerIntegration({
    id: "test-npm",
    name: "Test NPM",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [
      { kind: "username", value: "admin@example.com" },
      { kind: "password", value: "secret" },
    ],
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("parseNginxProxyManagerTokenAsync", () => {
  test("accepts a nested token object from older NPM versions", async () => {
    const parsed = await parseNginxProxyManagerTokenAsync({
      json: async () => ({ token: { token: "nested-token" } }),
    });
    expect(parsed.token).toBe("nested-token");
  });
});

describe("mapNginxProxyManagerDashboard", () => {
  test("groups hosts and certificates by expiry window", () => {
    const dashboard = mapNginxProxyManagerDashboard(
      [
        { id: 1, enabled: true, ssl_forced: 1, domain_names: ["app.example.com"] },
        { id: 2, enabled: false, ssl_forced: 0, domain_names: ["old.example.com"] },
      ],
      [
        { id: 1, nice_name: "ok.example.com", expires_on: "2099-01-01T00:00:00.000Z" },
        {
          id: 2,
          nice_name: "soon.example.com",
          expires_on: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { id: 3, nice_name: "expired.example.com", expires_on: "2020-01-01T00:00:00.000Z" },
      ],
      14,
    );

    expect(dashboard).toMatchObject({
      hostCount: 2,
      enabledHostCount: 1,
      disabledHostCount: 1,
      sslForcedCount: 1,
      certificateCount: 3,
      validCertificateCount: 1,
      expiringCertificateCount: 1,
      expiredCertificateCount: 1,
    });
  });
});

describe("NginxProxyManagerIntegration getDashboardAsync", () => {
  test("exchanges credentials for a token then loads hosts and certificates", async () => {
    mockFetch.mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("/api/tokens")) {
        return new Response(JSON.stringify({ token: "npm-token" }), {
          status: 200,
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      }
      if (href.includes("/api/nginx/certificates")) {
        return new Response(
          JSON.stringify([{ id: 1, nice_name: "app.example.com", expires_on: "2099-01-01T00:00:00.000Z" }]),
          {
            status: 200,
          },
        ) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      }
      return new Response(
        JSON.stringify([{ id: 1, enabled: true, ssl_forced: true, domain_names: ["app.example.com"] }]),
        {
          status: 200,
        },
      ) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
    });

    const dashboard = await createIntegration().getDashboardAsync();

    expect(dashboard.hostCount).toBe(1);
    expect(dashboard.certificateCount).toBe(1);
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ identity: "admin@example.com", secret: "secret" }),
    });
    expect(mockFetch.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer npm-token" },
    });
  });
});

describe("NginxProxyManagerIntegration testing endpoint", () => {
  type TestingFn = (input: IntegrationTestingInput) => Promise<{ success: boolean }>;

  const invokeTesting = (integration: NginxProxyManagerIntegration, input: IntegrationTestingInput) => {
    const testing = (integration as unknown as { testingAsync: TestingFn }).testingAsync.bind(integration);
    return testing(input);
  };

  test("returns success after a token exchange and hosts fetch", async () => {
    const fetchAsync = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "npm-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    const input = { fetchAsync } as unknown as IntegrationTestingInput;

    const result = await invokeTesting(createIntegration(), input);
    expect(result.success).toBe(true);
  });

  test("returns a status-code failure when token exchange fails", async () => {
    const input = {
      fetchAsync: vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })),
    } as unknown as IntegrationTestingInput;

    const result = await invokeTesting(createIntegration(), input);
    expect(result.success).toBe(false);
  });
});
