"use client";

import { Badge, Group, ScrollArea, Stack, Text, Title } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function CmdbWidget({ options }: WidgetComponentProps<"cmdb">) {
  const t = useI18n();
  const { data = [], isLoading } = clientApi.cmdb.listResources.useQuery({
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
        <Title order={5}>{t("widget.cmdb.name")}</Title>
        <Text size="sm" c="dimmed" ta="center">
          {t("widget.cmdb.empty")}
        </Text>
      </Stack>
    );
  }

  return (
    <ScrollArea h="100%" p="sm">
      <Stack gap="xs">
        <Title order={5}>{t("widget.cmdb.name")}</Title>
        {data.map((resource) => (
          <Stack key={resource.id} gap={2}>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" fw={600} lineClamp={1}>
                {resource.name}
              </Text>
              <Badge size="sm" variant="light">
                {resource.kind}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {t("widget.cmdb.neighbors", {
                from: resource.relationshipsFrom.length,
                to: resource.relationshipsTo.length,
                owners: resource.owners.length,
              })}
            </Text>
          </Stack>
        ))}
      </Stack>
    </ScrollArea>
  );
}
