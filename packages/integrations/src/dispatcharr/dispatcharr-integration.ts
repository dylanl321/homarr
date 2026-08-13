import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { DispatcharrDashboardData } from "./dispatcharr-types";
import { mapDispatcharrDashboard, parseDispatcharrJsonAsync } from "./dispatcharr-types";

const REQUEST_TIMEOUT_MS = 10_000;

export class DispatcharrIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/channels/channels/", { page_size: 1 }), {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    try {
      await parseDispatcharrJsonAsync(response);
    } catch (error) {
      if (error instanceof ParseError) {
        return TestConnectionError.ParseResult(error);
      }
      throw error;
    }

    return { success: true };
  }

  public async getDashboardAsync(): Promise<DispatcharrDashboardData> {
    const [channels, streams, activeStreams, proxyStatus] = await Promise.all([
      this.getJsonAsync("/api/channels/channels/", { page_size: 1 }),
      this.getJsonAsync("/api/channels/streams/", { page_size: 1 }),
      this.getJsonAsync("/api/channels/streams/", { page_size: 1, hide_stale: true }),
      this.getJsonAsync("/proxy/ts/status"),
    ]);

    return mapDispatcharrDashboard({
      channels,
      streams,
      staleStreams: activeStreams,
      proxyStatus,
    });
  }

  private async getJsonAsync(
    path: `/${string}`,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<unknown> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path, queryParams), {
      headers: this.getAuthHeaders(),
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return await parseDispatcharrJsonAsync(response);
  }

  private getAuthHeaders(): Record<string, string> {
    const apiKey = this.getSecretValue("apiKey");
    return {
      "X-API-Key": apiKey,
      Authorization: `ApiKey ${apiKey}`,
    };
  }
}
