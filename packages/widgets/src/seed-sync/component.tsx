"use client";

import { Badge, Group, Progress, ScrollArea, Stack, Text, Title } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatByteRate, formatBytes, formatDuration } from "@homarr/common";
import type { SeedSyncDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

const emptyDashboard: SeedSyncDashboardData = {
  serverUp: true,
  serverError: null,
  remoteScanFailed: false,
  queued: 0,
  downloading: 0,
  completed: 0,
  failed: 0,
  totalSpeed: 0,
  remoteSize: 0,
  localSize: 0,
  transfers: [],
};

export default function SeedSyncWidget({ integrationIds, options }: WidgetComponentProps<"seedSync">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  const t = useScopedI18n("widget.seedSync");
  const { data } = clientApi.widget.seedSync.getDashboard.useQuery({ integrationIds });

  if (!data) return <WidgetEmptyState />;

  const combined = data.reduce<SeedSyncDashboardData>(
    (acc, item) => ({
      serverUp: acc.serverUp && item.dashboard.serverUp,
      serverError: acc.serverError ?? item.dashboard.serverError,
      remoteScanFailed: acc.remoteScanFailed || item.dashboard.remoteScanFailed,
      queued: acc.queued + item.dashboard.queued,
      downloading: acc.downloading + item.dashboard.downloading,
      completed: acc.completed + item.dashboard.completed,
      failed: acc.failed + item.dashboard.failed,
      totalSpeed: acc.totalSpeed + item.dashboard.totalSpeed,
      remoteSize: acc.remoteSize + item.dashboard.remoteSize,
      localSize: acc.localSize + item.dashboard.localSize,
      transfers: [...acc.transfers, ...item.dashboard.transfers],
    }),
    emptyDashboard,
  );

  const storageTotal = combined.remoteSize + combined.localSize;
  const transfers = combined.transfers.slice(0, options.limit);

  return (
    <ScrollArea h="100%" p="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Title order={5}>{t("name")}</Title>
          <Text size="xs" c="dimmed">
            {t("speed")}: {formatByteRate(combined.totalSpeed)}
          </Text>
        </Group>
        <Group gap="xs">
          <Badge variant="light">
            {t("queued")}: {combined.queued}
          </Badge>
          <Badge variant="light" color="blue">
            {t("downloading")}: {combined.downloading}
          </Badge>
          <Badge variant="light" color="green">
            {t("completed")}: {combined.completed}
          </Badge>
          <Badge variant="light" color="red">
            {t("failed")}: {combined.failed}
          </Badge>
        </Group>
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {t("remote")} {formatBytes(combined.remoteSize)}
            </Text>
            <Text size="xs" c="dimmed">
              {t("local")} {formatBytes(combined.localSize)}
            </Text>
          </Group>
          <Progress value={storageTotal === 0 ? 0 : (combined.localSize / storageTotal) * 100} size="sm" />
        </Stack>
        {transfers.map((transfer) => (
          <Group key={`${transfer.fullPath ?? transfer.name}-${transfer.state}`} justify="space-between" wrap="nowrap">
            <Text size="sm" lineClamp={1} miw={0}>
              {transfer.name}
            </Text>
            <Group gap={4} wrap="nowrap">
              <Badge
                size="xs"
                variant="light"
                color={transfer.state.includes("fail") || transfer.state === "corrupt" ? "red" : "blue"}
              >
                {transfer.state}
              </Badge>
              {transfer.downloadingSpeed ? (
                <Text size="xs" c="dimmed">
                  {formatByteRate(transfer.downloadingSpeed)}
                </Text>
              ) : null}
              {transfer.eta ? (
                <Text size="xs" c="dimmed">
                  {t("eta")} {formatDuration(transfer.eta * 1000)}
                </Text>
              ) : null}
            </Group>
          </Group>
        ))}
      </Stack>
    </ScrollArea>
  );
}
