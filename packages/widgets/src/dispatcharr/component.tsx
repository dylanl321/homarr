"use client";

import { Badge, Group, ScrollArea, Stack, Text, Title } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatByteRate } from "@homarr/common";
import type { DispatcharrDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

const emptyDashboard: DispatcharrDashboardData = {
  channelCount: 0,
  streamCount: 0,
  staleStreamCount: 0,
  activeSessions: 0,
  clientCount: 0,
  sessions: [],
};

export default function DispatcharrWidget({ integrationIds, options }: WidgetComponentProps<"dispatcharr">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  const t = useScopedI18n("widget.dispatcharr");
  const { data } = clientApi.widget.dispatcharr.getDashboard.useQuery({ integrationIds });

  if (!data) return <WidgetEmptyState />;

  const combined = data.reduce<DispatcharrDashboardData>(
    (acc, item) => ({
      channelCount: acc.channelCount + item.dashboard.channelCount,
      streamCount: acc.streamCount + item.dashboard.streamCount,
      staleStreamCount: acc.staleStreamCount + item.dashboard.staleStreamCount,
      activeSessions: acc.activeSessions + item.dashboard.activeSessions,
      clientCount: acc.clientCount + item.dashboard.clientCount,
      sessions: [...acc.sessions, ...item.dashboard.sessions],
    }),
    emptyDashboard,
  );

  const sessions = combined.sessions.slice(0, options.limit);

  return (
    <ScrollArea h="100%" p="sm">
      <Stack gap="xs">
        <Title order={5}>{t("name")}</Title>
        <Group gap="xs">
          <Badge variant="light">
            {t("channels")}: {combined.channelCount}
          </Badge>
          <Badge variant="light">
            {t("streams")}: {combined.streamCount}
          </Badge>
          <Badge variant="light" color="orange">
            {t("stale")}: {combined.staleStreamCount}
          </Badge>
          <Badge variant="light" color="blue">
            {t("sessions")}: {combined.activeSessions}
          </Badge>
          <Badge variant="light">
            {t("clients")}: {combined.clientCount}
          </Badge>
        </Group>
        {sessions.map((session) => (
          <Group key={session.id} justify="space-between" wrap="nowrap">
            <Text size="sm" lineClamp={1} miw={0}>
              {session.name}
            </Text>
            <Group gap={4} wrap="nowrap">
              <Badge size="xs" variant="light">
                {t("clients")}: {session.clientCount}
              </Badge>
              {session.bitrate ? (
                <Text size="xs" c="dimmed">
                  {t("bitrate")} {formatByteRate(session.bitrate)}
                </Text>
              ) : null}
            </Group>
          </Group>
        ))}
      </Stack>
    </ScrollArea>
  );
}
