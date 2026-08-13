import { ParseError } from "@homarr/common/server";
import dayjs from "dayjs";
import { z } from "zod/v4";

const NPM_PARSE_ERROR = "Invalid Nginx Proxy Manager response";

export const nginxProxyManagerTokenSchema = z
  .object({
    token: z.union([z.string().min(1), z.object({ token: z.string().min(1) })]),
  })
  .transform((data) => ({
    token: typeof data.token === "string" ? data.token : data.token.token,
  }));

const certificateSchema = z
  .object({
    id: z.number(),
    nice_name: z.string().optional(),
    domain_names: z.array(z.string()).optional(),
    expires_on: z.string().nullable().optional(),
    provider: z.string().optional(),
  })
  .passthrough();

const proxyHostSchema = z
  .object({
    id: z.number(),
    enabled: z.union([z.boolean(), z.number()]).optional(),
    ssl_forced: z.union([z.boolean(), z.number()]).optional(),
    domain_names: z.array(z.string()).optional(),
    certificate: certificateSchema.nullable().optional(),
  })
  .passthrough();

export const nginxProxyManagerHostsSchema = z.array(proxyHostSchema);
export const nginxProxyManagerCertificatesSchema = z.array(certificateSchema);

export interface NginxProxyManagerCertificate {
  id: number;
  name: string;
  expiresOn: string | null;
  daysRemaining: number | null;
}

export interface NginxProxyManagerDashboardData {
  hostCount: number;
  enabledHostCount: number;
  disabledHostCount: number;
  sslForcedCount: number;
  certificateCount: number;
  validCertificateCount: number;
  expiringCertificateCount: number;
  expiredCertificateCount: number;
  certificates: NginxProxyManagerCertificate[];
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

export const parseNginxProxyManagerTokenAsync = async (response: { json: () => Promise<unknown> }) => {
  const json = await parseJsonAsync(response, NPM_PARSE_ERROR);
  const parsed = await nginxProxyManagerTokenSchema.safeParseAsync(json);
  if (!parsed.success) {
    throw new ParseError(NPM_PARSE_ERROR, { cause: parsed.error });
  }
  return parsed.data;
};

export const parseNginxProxyManagerHostsAsync = async (response: { json: () => Promise<unknown> }) => {
  const json = await parseJsonAsync(response, NPM_PARSE_ERROR);
  const parsed = await nginxProxyManagerHostsSchema.safeParseAsync(json);
  if (!parsed.success) {
    throw new ParseError(NPM_PARSE_ERROR, { cause: parsed.error });
  }
  return parsed.data;
};

export const parseNginxProxyManagerCertificatesAsync = async (response: { json: () => Promise<unknown> }) => {
  const json = await parseJsonAsync(response, NPM_PARSE_ERROR);
  const parsed = await nginxProxyManagerCertificatesSchema.safeParseAsync(json);
  if (!parsed.success) {
    throw new ParseError(NPM_PARSE_ERROR, { cause: parsed.error });
  }
  return parsed.data;
};

const isEnabled = (value: boolean | number | undefined) => value === true || value === 1;

const daysRemaining = (expiresOn: string | null | undefined): number | null => {
  if (!expiresOn) return null;
  const expiry = dayjs(expiresOn);
  if (!expiry.isValid()) return null;
  return expiry.startOf("day").diff(dayjs().startOf("day"), "day");
};

export const mapNginxProxyManagerDashboard = (
  hosts: z.infer<typeof nginxProxyManagerHostsSchema>,
  certificates: z.infer<typeof nginxProxyManagerCertificatesSchema>,
  expiryDays: number,
): NginxProxyManagerDashboardData => {
  const mappedCertificates: NginxProxyManagerCertificate[] = certificates.map((certificate) => ({
    id: certificate.id,
    name: certificate.nice_name ?? certificate.domain_names?.[0] ?? `Certificate ${certificate.id}`,
    expiresOn: certificate.expires_on ?? null,
    daysRemaining: daysRemaining(certificate.expires_on),
  }));

  const expiredCertificateCount = mappedCertificates.filter(
    (certificate) => certificate.daysRemaining !== null && certificate.daysRemaining < 0,
  ).length;
  const expiringCertificateCount = mappedCertificates.filter(
    (certificate) =>
      certificate.daysRemaining !== null && certificate.daysRemaining >= 0 && certificate.daysRemaining <= expiryDays,
  ).length;

  return {
    hostCount: hosts.length,
    enabledHostCount: hosts.filter((host) => isEnabled(host.enabled)).length,
    disabledHostCount: hosts.filter((host) => !isEnabled(host.enabled)).length,
    sslForcedCount: hosts.filter((host) => isEnabled(host.ssl_forced)).length,
    certificateCount: mappedCertificates.length,
    validCertificateCount: mappedCertificates.length - expiredCertificateCount - expiringCertificateCount,
    expiringCertificateCount,
    expiredCertificateCount,
    certificates: mappedCertificates,
  };
};
