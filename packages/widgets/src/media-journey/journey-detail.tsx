"use client";

import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { MediaTraceStage } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { healthColor, latestEventForStage } from "./health-style";
import type { MediaJourneyTrace } from "./types";

dayjs.extend(relativeTime);

interface JourneyDetailProps {
  trace: MediaJourneyTrace;
  stage: MediaTraceStage | null;
  compact?: boolean;
}

export const JourneyDetail = ({ trace, stage, compact }: JourneyDetailProps) => {
  const t = useI18n();
  const event = stage ? latestEventForStage(trace.events, stage) : undefined;
  const source = event?.integrationKind ?? event?.integrationId;

  return (
    <Paper withBorder p={compact ? 6 : "sm"} radius="md">
      <Stack gap={compact ? 4 : 6}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size={compact ? "xs" : "sm"} fw={600} lineClamp={1}>
            {trace.title}
          </Text>
          <Badge size="xs" variant="light" color={healthColor[trace.health.health]}>
            {t(`widget.mediaJourney.health.${trace.health.health}`)}
          </Badge>
        </Group>
        {trace.health.issues.map((reason) => (
          <Text key={reason} size="xs" c="dimmed">
            {t(`widget.mediaJourney.issue.${reason}`)}
          </Text>
        ))}
        {stage ? (
          event ? (
            <Stack gap={2}>
              <Text size="xs">
                {t("widget.mediaJourney.detail.status")}: {event.status ?? t("widget.mediaJourney.detail.waiting")}
              </Text>
              {source ? (
                <Text size="xs" c="dimmed">
                  {t("widget.mediaJourney.detail.source")}: {source}
                </Text>
              ) : null}
              <Text size="xs" c="dimmed">
                {t("widget.mediaJourney.detail.age")}: {dayjs(event.occurredAt).fromNow()}
              </Text>
            </Stack>
          ) : (
            <Text size="xs" c="dimmed">
              {t(`widget.mediaJourney.stage.${stage}`)} · {t("widget.mediaJourney.detail.waiting")}
            </Text>
          )
        ) : null}
      </Stack>
    </Paper>
  );
};
