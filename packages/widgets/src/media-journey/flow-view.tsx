"use client";

import { Badge, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { MediaTraceStage } from "@homarr/definitions";
import { mediaTraceStages } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { flowNodeColor, flowNodeState, healthColor } from "./health-style";
import type { MediaJourneyTrace } from "./types";

dayjs.extend(relativeTime);

interface FlowViewProps {
  traces: MediaJourneyTrace[];
  compact?: boolean;
  selectedId: string | null;
  selectedStage: MediaTraceStage | null;
  onSelect: (trace: MediaJourneyTrace, stage?: MediaTraceStage) => void;
}

export const FlowView = ({ traces, compact, selectedId, selectedStage, onSelect }: FlowViewProps) => {
  const t = useI18n();

  return (
    <Stack gap={compact ? "xs" : "sm"}>
      {traces.map((trace) => (
        <Paper key={trace.id} withBorder p={compact ? 6 : "sm"} radius="md">
          <Stack gap={compact ? 4 : 8}>
            <UnstyledButton onClick={() => onSelect(trace)} w="100%">
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size={compact ? "xs" : "sm"} fw={600} lineClamp={1}>
                  {trace.title}
                </Text>
                <Badge size="xs" variant="light" color={healthColor[trace.health.health]}>
                  {t(`widget.mediaJourney.health.${trace.health.health}`)}
                </Badge>
              </Group>
            </UnstyledButton>
            <Group gap={4} wrap="nowrap">
              {mediaTraceStages.map((stage, index) => {
                const state = flowNodeState(stage, trace);
                const selected = selectedId === trace.id && selectedStage === stage;
                return (
                  <Group key={stage} gap={4} wrap="nowrap">
                    <UnstyledButton onClick={() => onSelect(trace, stage)}>
                      <Badge
                        size={compact ? "xs" : "sm"}
                        variant={state === "waiting" ? "outline" : "filled"}
                        color={flowNodeColor[state]}
                        style={{
                          outline: selected ? "2px solid var(--mantine-color-blue-filled)" : undefined,
                          outlineOffset: 2,
                        }}
                      >
                        {t(`widget.mediaJourney.stage.${stage}`)}
                      </Badge>
                    </UnstyledButton>
                    {index < mediaTraceStages.length - 1 ? (
                      <Text size="xs" c="dimmed">
                        →
                      </Text>
                    ) : null}
                  </Group>
                );
              })}
            </Group>
            <Text size="xs" c="dimmed">
              {dayjs().subtract(trace.health.ageMs, "millisecond").fromNow()}
            </Text>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};
