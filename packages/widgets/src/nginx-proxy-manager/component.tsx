"use client";

import { Badge, Group, ScrollArea, Stack, Text, Title } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { NginxProxyManagerDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

const emptyDashboard: NginxProxyManagerDashboardData = {
  hostCount: 0,
  enabledHostCount: 0,
  disabledHostCount: 0,
  sslForcedCount: 0,
  certificateCount: 0,
  validCertificateCount: 0,
  expiringCertificateCount: 0,
  expiredCertificateCount: 0,
  certificates: [],
};

export default function NginxProxyManagerWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"nginxProxyManager">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  const t = useScopedI18n("widget.nginxProxyManager");
  const { data } = clientApi.widget.nginxProxyManager.getDashboard.useQuery({
    integrationIds,
    expiryDays: options.expiryDays,
  });

  if (!data) return <WidgetEmptyState />;

  const combined = data.reduce<NginxProxyManagerDashboardData>(
    (acc, item) => ({
      hostCount: acc.hostCount + item.dashboard.hostCount,
      enabledHostCount: acc.enabledHostCount + item.dashboard.enabledHostCount,
      disabledHostCount: acc.disabledHostCount + item.dashboard.disabledHostCount,
      sslForcedCount: acc.sslForcedCount + item.dashboard.sslForcedCount,
      certificateCount: acc.certificateCount + item.dashboard.certificateCount,
      validCertificateCount: acc.validCertificateCount + item.dashboard.validCertificateCount,
      expiringCertificateCount: acc.expiringCertificateCount + item.dashboard.expiringCertificateCount,
      expiredCertificateCount: acc.expiredCertificateCount + item.dashboard.expiredCertificateCount,
      certificates: [...acc.certificates, ...item.dashboard.certificates],
    }),
    emptyDashboard,
  );

  const notableCertificates = combined.certificates
    .filter((certificate) => certificate.daysRemaining !== null && certificate.daysRemaining <= options.expiryDays)
    .toSorted((left, right) => (left.daysRemaining ?? 0) - (right.daysRemaining ?? 0))
    .slice(0, 8);

  return (
    <ScrollArea h="100%" p="sm">
      <Stack gap="xs">
        <Title order={5}>{t("name")}</Title>
        <Group gap="xs">
          <Badge variant="light">
            {t("hosts")}: {combined.hostCount}
          </Badge>
          <Badge variant="light" color="green">
            {t("enabled")}: {combined.enabledHostCount}
          </Badge>
          <Badge variant="light" color="gray">
            {t("disabled")}: {combined.disabledHostCount}
          </Badge>
          <Badge variant="light">
            {t("sslForced")}: {combined.sslForcedCount}
          </Badge>
        </Group>
        <Group gap="xs">
          <Badge variant="light">
            {t("certificates")}: {combined.certificateCount}
          </Badge>
          <Badge variant="light" color="green">
            {t("valid")}: {combined.validCertificateCount}
          </Badge>
          <Badge variant="light" color="orange">
            {t("expiring")}: {combined.expiringCertificateCount}
          </Badge>
          <Badge variant="light" color="red">
            {t("expired")}: {combined.expiredCertificateCount}
          </Badge>
        </Group>
        {notableCertificates.map((certificate) => (
          <Group key={`${certificate.id}-${certificate.name}`} justify="space-between" wrap="nowrap">
            <Text size="sm" lineClamp={1} miw={0}>
              {certificate.name}
            </Text>
            <Badge size="xs" color={(certificate.daysRemaining ?? 0) < 0 ? "red" : "orange"} variant="light">
              {certificate.daysRemaining === null
                ? t("certificates")
                : certificate.daysRemaining < 0
                  ? t("expired")
                  : `${certificate.daysRemaining}d`}
            </Badge>
          </Group>
        ))}
      </Stack>
    </ScrollArea>
  );
}
