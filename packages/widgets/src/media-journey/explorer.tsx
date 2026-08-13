"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Anchor, Group, ScrollArea, SegmentedControl, Stack, Text, Title } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { MediaTraceStage } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { FlowView } from "./flow-view";
import { IssuesView } from "./issues-view";
import { JourneyDetail } from "./journey-detail";
import { PipelineView } from "./pipeline-view";
import type { MediaJourneyTrace, MediaJourneyView, MediaJourneyViewMode } from "./types";
import { mediaJourneyViews, resolveMediaJourneyView } from "./view-mode";

export interface MediaJourneyExplorerProps {
  search?: string;
  limit?: number;
  viewMode?: MediaJourneyViewMode;
  width?: number;
  height?: number;
  layout?: "manage" | "widget";
}

export const MediaJourneyExplorer = ({
  search,
  limit = 50,
  viewMode = "auto",
  width,
  height,
  layout = "widget",
}: MediaJourneyExplorerProps) => {
  const t = useI18n();
  const compact = layout === "widget";
  const [manualView, setManualView] = useState<MediaJourneyView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<MediaTraceStage | null>(null);

  const { data = [], isLoading } = clientApi.mediaTrace.list.useQuery({
    search: search?.trim() || undefined,
    limit,
  });

  const hasIssues = data.some((trace) => trace.health.health === "failed" || trace.health.health === "delayed");
  const resolvedView = resolveMediaJourneyView(viewMode, { width, height, hasIssues });
  const activeView = layout === "manage" ? (manualView ?? resolvedView) : resolvedView;
  const selected = useMemo(() => data.find((trace) => trace.id === selectedId) ?? null, [data, selectedId]);

  const onSelect = (trace: MediaJourneyTrace, stage?: MediaTraceStage) => {
    setSelectedId(trace.id);
    setSelectedStage(stage ?? trace.health.currentStage);
  };

  const body = (() => {
    if (isLoading) {
      return (
        <Text size="sm" c="dimmed" ta="center">
          {t("common.action.loading")}
        </Text>
      );
    }

    if (data.length === 0) {
      return <EmptyState layout={layout} />;
    }

    if (activeView === "pipeline") {
      return <PipelineView traces={data} compact={compact} selectedId={selectedId} onSelect={onSelect} />;
    }

    if (activeView === "flow") {
      return (
        <FlowView
          traces={data}
          compact={compact}
          selectedId={selectedId}
          selectedStage={selectedStage}
          onSelect={onSelect}
        />
      );
    }

    return <IssuesView traces={data} compact={compact} selectedId={selectedId} onSelect={onSelect} />;
  })();

  const content = (
    <Stack gap={compact ? "xs" : "md"} h={compact ? "100%" : undefined}>
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        {compact ? (
          <Title order={5}>{t("widget.mediaJourney.name")}</Title>
        ) : (
          <Text size="sm" c="dimmed">
            {t("widget.mediaJourney.description")}
          </Text>
        )}
        {layout === "manage" ? (
          <SegmentedControl
            size="sm"
            value={activeView}
            onChange={(value) => setManualView(value as MediaJourneyView)}
            data={mediaJourneyViews.map((view) => ({
              value: view,
              label: t(`widget.mediaJourney.view.${view}`),
            }))}
          />
        ) : null}
      </Group>
      {body}
      {selected ? <JourneyDetail trace={selected} stage={selectedStage} compact={compact} /> : null}
    </Stack>
  );

  if (!compact) {
    return content;
  }

  return (
    <ScrollArea h="100%" p="sm">
      {content}
    </ScrollArea>
  );
};

const EmptyState = ({ layout }: { layout: "manage" | "widget" }) => {
  const t = useI18n();

  if (layout === "widget") {
    return (
      <Text size="sm" c="dimmed" ta="center">
        {t.rich("widget.mediaJourney.empty", {
          manage: emptyManageLink,
        })}
      </Text>
    );
  }

  return (
    <Text size="sm" c="dimmed" ta="center">
      {t.rich("mediaJourney.page.list.noResults", {
        integrations: emptyIntegrationsLink,
        tasks: emptyTasksLink,
      })}
    </Text>
  );
};

const emptyManageLink = (chunks: ReactNode) => (
  <Anchor component={Link} href="/manage/media-journey" size="sm">
    {chunks}
  </Anchor>
);

const emptyIntegrationsLink = (chunks: ReactNode) => (
  <Anchor component={Link} href="/manage/integrations" size="sm">
    {chunks}
  </Anchor>
);

const emptyTasksLink = (chunks: ReactNode) => (
  <Anchor component={Link} href="/manage/tools/tasks" size="sm">
    {chunks}
  </Anchor>
);
