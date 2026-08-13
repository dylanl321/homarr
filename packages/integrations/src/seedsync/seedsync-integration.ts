import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { SeedSyncDashboardData } from "./seedsync-types";
import {
  mapSeedSyncDashboard,
  parseSeedSyncModelJson,
  parseSeedSyncStatusResponseAsync,
  parseSseEventData,
} from "./seedsync-types";

const REQUEST_TIMEOUT_MS = 15_000;

export class SeedSyncIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/server/status"), {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    try {
      await parseSeedSyncStatusResponseAsync(response);
    } catch (error) {
      if (error instanceof ParseError) {
        return TestConnectionError.ParseResult(error);
      }
      throw error;
    }

    return { success: true };
  }

  public async getDashboardAsync(): Promise<SeedSyncDashboardData> {
    const [statusResponse, modelFiles] = await Promise.all([
      fetchWithTrustedCertificatesAsync(this.url("/server/status"), {
        headers: this.getAuthHeaders(),
        timeout: REQUEST_TIMEOUT_MS,
      }),
      this.getModelFilesAsync(),
    ]);

    if (!statusResponse.ok) {
      throw new ResponseError(statusResponse);
    }

    const status = await parseSeedSyncStatusResponseAsync(statusResponse);
    return mapSeedSyncDashboard(modelFiles, status);
  }

  private async getModelFilesAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/server/stream"), {
      headers: {
        ...this.getAuthHeaders(),
        Accept: "text/event-stream",
      },
      timeout: REQUEST_TIMEOUT_MS,
      bodyTimeout: REQUEST_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const eventData = await this.readSseEventAsync(response.body, "model-init");
    let json: unknown;
    try {
      json = JSON.parse(eventData) as unknown;
    } catch (error) {
      throw new ParseError("Invalid SeedSync model response", {
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }

    return parseSeedSyncModelJson(json);
  }

  private async readSseEventAsync(
    body: {
      getReader: () => {
        read: () => Promise<{ done: boolean; value?: Uint8Array }>;
        cancel: () => Promise<unknown>;
      };
    } | null,
    eventName: string,
  ) {
    if (!body) {
      throw new ParseError("SeedSync stream has no body");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
        }
        const data = parseSseEventData(buffer, eventName);
        if (data !== null) {
          return data;
        }
        if (done) {
          break;
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }

    throw new ParseError(`SeedSync stream ended without ${eventName} event`);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.hasSecretValue("apiKey")) {
      return {};
    }

    return { "X-API-Key": this.getSecretValue("apiKey") };
  }
}
