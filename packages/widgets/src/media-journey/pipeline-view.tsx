"use client";

import { Badge, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { mediaTraceStages } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { healthColor } from "./health-style";
import type { MediaJourneyTrace } from "./types";

dayjs.extend(relativeTime);

interface PipelineViewProps {
  traces: MediaJourneyTrace[];
  compact?: boolean;
  selectedId: string | null;
  onSelect: (trace: MediaJourneyTrace) => void;
}

export const PipelineView = ({ traces, compact, selectedId, onSelect }: PipelineViewProps) => {
  const t = useI18n();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${mediaTraceStages.length}, minmax(${compact ? "110px" : "160px"}, 1fr))`,
        gap: compact ? 8 : 12,
        minWidth: compact ? 560 : 800,
      }}
    >
      {mediaTraceStages.map((stage) => {
        const cards = traces.filter((trace) => trace.health.currentStage === stage);
        return (
          <Stack key={stage} gap={compact ? 6 : "xs"}>
            <Text size={compact ? "xs" : "sm"} fw={600} tt="uppercase">
              {t(`widget.mediaJourney.stage.${stage}`)}
            </Text>
            {cards.length === 0 ? (
              <Text size="xs" c="dimmed">
                {t("widget.mediaJourney.columnEmpty")}
              </Text>
            ) : (
              cards.map((trace) => (
                <JourneyCard
                  key={trace.id}
                  trace={trace}
                  compact={compact}
                  selected={selectedId === trace.id}
                  onSelect={() => onSelect(trace)}
                />
              ))
            )}
          </Stack>
        );
      })}
    </div>
  );
};

interface JourneyCardProps {
  trace: MediaJourneyTrace;
  compact?: boolean;
  selected: boolean;
  onSelect: () => void;
}

const JourneyCard = ({ trace, compact, selected, onSelect }: JourneyCardProps) => {
  const t = useI18n();

  return (
    <UnstyledButton onClick={onSelect} w="100%">
      <Paper
        withBorder
        p={compact ? 6 : "sm"}
        radius="md"
        style={{
          borderColor: selected ? "var(--mantine-color-blue-filled)" : undefined,
        }}
      >
        <Stack gap={4}>
          <Text size={compact ? "xs" : "sm"} fw={600} lineClamp={2}>
            {trace.title}
          </Text>
          <Badge size="xs" variant="light" color={healthColor[trace.health.health]}>
            {t(`widget.mediaJourney.health.${trace.health.health}`)}
          </Badge>
          <Text size="xs" c="dimmed">
            {t(`widget.mediaJourney.stage.${trace.health.currentStage}`)} ·{" "}
            {dayjs().subtract(trace.health.ageMs, "millisecond").fromNow()}
          </Text>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
};
