"use client";

import { Badge, Group, ScrollArea, Stack, Text, Title } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

const stageOrder = ["request", "grab", "download", "import", "library"] as const;

export default function MediaJourneyWidget({ options }: WidgetComponentProps<"mediaJourney">) {
  const t = useI18n();
  const { data = [], isLoading } = clientApi.mediaTrace.list.useQuery({
    search: options.search.trim() || undefined,
    limit: options.limit,
  });

  if (isLoading) {
    return (
      <Stack h="100%" justify="center" align="center" p="sm">
        <Text size="sm" c="dimmed">
          {t("common.action.loading")}
        </Text>
      </Stack>
    );
  }

  if (data.length === 0) {
    return (
      <Stack h="100%" justify="center" align="center" p="sm">
        <Title order={5}>{t("widget.mediaJourney.name")}</Title>
        <Text size="sm" c="dimmed" ta="center">
          {t("widget.mediaJourney.empty")}
        </Text>
      </Stack>
    );
  }

  return (
    <ScrollArea h="100%" p="sm">
      <Stack gap="sm">
        <Title order={5}>{t("widget.mediaJourney.name")}</Title>
        {data.map((trace) => {
          const stages = new Set(trace.events.map((event) => event.stage));
          return (
            <Stack key={trace.id} gap={4}>
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw={600} lineClamp={1}>
                  {trace.title}
                </Text>
                <Badge size="sm" variant="light">
                  {trace.mediaType}
                </Badge>
              </Group>
              <Group gap={4}>
                {stageOrder.map((stage) => (
                  <Badge key={stage} size="xs" variant={stages.has(stage) ? "filled" : "outline"} color="gray">
                    {t(`widget.mediaJourney.stage.${stage}`)}
                  </Badge>
                ))}
              </Group>
              <Text size="xs" c="dimmed">
                {trace.status}
                {trace.tmdbId ? ` · TMDB ${trace.tmdbId}` : ""}
              </Text>
            </Stack>
          );
        })}
      </Stack>
    </ScrollArea>
  );
}
