import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { NginxProxyManagerDashboardData } from "./nginx-proxy-manager-types";
import {
  mapNginxProxyManagerDashboard,
  parseNginxProxyManagerCertificatesAsync,
  parseNginxProxyManagerHostsAsync,
  parseNginxProxyManagerTokenAsync,
} from "./nginx-proxy-manager-types";

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_EXPIRY_DAYS = 14;

export class NginxProxyManagerIntegration extends Integration {
  private token: string | null = null;

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const tokenResponse = await input.fetchAsync(this.url("/api/tokens"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: this.getSecretValue("username"),
        secret: this.getSecretValue("password"),
      }),
    });
    if (!tokenResponse.ok) {
      return TestConnectionError.StatusResult(tokenResponse);
    }

    let token: string;
    try {
      token = (await parseNginxProxyManagerTokenAsync(tokenResponse)).token;
    } catch (error) {
      if (error instanceof ParseError) {
        return TestConnectionError.ParseResult(error);
      }
      throw error;
    }

    const hostsResponse = await input.fetchAsync(this.url("/api/nginx/proxy-hosts"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!hostsResponse.ok) {
      return TestConnectionError.StatusResult(hostsResponse);
    }

    try {
      await parseNginxProxyManagerHostsAsync(hostsResponse);
    } catch (error) {
      if (error instanceof ParseError) {
        return TestConnectionError.ParseResult(error);
      }
      throw error;
    }

    return { success: true };
  }

  public async getDashboardAsync(expiryDays = DEFAULT_EXPIRY_DAYS): Promise<NginxProxyManagerDashboardData> {
    const token = await this.getTokenAsync();
    const headers = { Authorization: `Bearer ${token}` };

    const [hostsResponse, certificatesResponse] = await Promise.all([
      fetchWithTrustedCertificatesAsync(this.url("/api/nginx/proxy-hosts", { expand: "certificate" }), {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      }),
      fetchWithTrustedCertificatesAsync(this.url("/api/nginx/certificates"), {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      }),
    ]);

    if (!hostsResponse.ok) {
      throw new ResponseError(hostsResponse);
    }
    if (!certificatesResponse.ok) {
      throw new ResponseError(certificatesResponse);
    }

    const [hosts, certificates] = await Promise.all([
      parseNginxProxyManagerHostsAsync(hostsResponse),
      parseNginxProxyManagerCertificatesAsync(certificatesResponse),
    ]);

    return mapNginxProxyManagerDashboard(hosts, certificates, expiryDays);
  }

  private async getTokenAsync(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/tokens"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: this.getSecretValue("username"),
        secret: this.getSecretValue("password"),
      }),
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = await parseNginxProxyManagerTokenAsync(response);
    this.token = parsed.token;
    return this.token;
  }
}
