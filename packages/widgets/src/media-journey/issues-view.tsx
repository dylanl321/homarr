"use client";

import { Badge, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useI18n } from "@homarr/translation/client";

import { healthColor } from "./health-style";
import type { MediaJourneyTrace } from "./types";

dayjs.extend(relativeTime);

interface IssuesViewProps {
  traces: MediaJourneyTrace[];
  compact?: boolean;
  selectedId: string | null;
  onSelect: (trace: MediaJourneyTrace) => void;
}

export const IssuesView = ({ traces, compact, selectedId, onSelect }: IssuesViewProps) => {
  const t = useI18n();
  const issues = traces.filter((trace) => trace.health.health === "failed" || trace.health.health === "delayed");

  if (issues.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center">
        {t("widget.mediaJourney.issuesEmpty")}
      </Text>
    );
  }

  return (
    <Stack gap={compact ? 6 : "xs"}>
      {issues.map((trace) => (
        <UnstyledButton key={trace.id} onClick={() => onSelect(trace)}>
          <Paper
            withBorder
            p={compact ? 6 : "sm"}
            radius="md"
            style={{
              borderColor: selectedId === trace.id ? "var(--mantine-color-blue-filled)" : undefined,
            }}
          >
            <Stack gap={4}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size={compact ? "xs" : "sm"} fw={600} lineClamp={1}>
                  {trace.title}
                </Text>
                <Badge size="xs" variant="light" color={healthColor[trace.health.health]}>
                  {t(`widget.mediaJourney.health.${trace.health.health}`)}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {t(`widget.mediaJourney.stage.${trace.health.currentStage}`)} ·{" "}
                {dayjs().subtract(trace.health.ageMs, "millisecond").fromNow()}
              </Text>
              {trace.health.issues.length > 0 ? (
                <Group gap={4}>
                  {trace.health.issues.map((reason) => (
                    <Badge key={reason} size="xs" variant="outline" color={healthColor[trace.health.health]}>
                      {t(`widget.mediaJourney.issue.${reason}`)}
                    </Badge>
                  ))}
                </Group>
              ) : null}
            </Stack>
          </Paper>
        </UnstyledButton>
      ))}
    </Stack>
  );
};
