"use client";

import { ActionIcon, Badge, Group, Stack, Table, Text } from "@mantine/core";
import { IconPencil, IconTopologyStar } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { NoResults } from "~/components/no-results";
import { CmdbDeleteButton } from "./_cmdb-delete-button";

const iconProps = { size: 16, stroke: 1.5 };

interface CmdbResourceListProps {
  resources: RouterOutputs["cmdb"]["listResources"];
}

export const CmdbResourceList = ({ resources }: CmdbResourceListProps) => {
  const t = useScopedI18n("cmdb");

  if (resources.length === 0) {
    return (
      <NoResults
        icon={IconTopologyStar}
        title={t("page.list.noResults")}
        action={{ href: "/manage/cmdb/new", label: t("action.create") }}
      />
    );
  }

  return (
    <Stack gap="md">
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("table.name")}</Table.Th>
            <Table.Th>{t("table.kind")}</Table.Th>
            <Table.Th>{t("table.description")}</Table.Th>
            <Table.Th>{t("table.relationships")}</Table.Th>
            <Table.Th w={90} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {resources.map((resource) => (
            <Table.Tr key={resource.id}>
              <Table.Td>
                <Text size="sm" fw={500} lineClamp={1}>
                  {resource.name}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge size="sm" variant="light">
                  {resource.kind}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {resource.description ?? ""}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {resource.relationshipsFrom.length + resource.relationshipsTo.length}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} justify="flex-end" wrap="nowrap">
                  <ActionIcon
                    component={Link}
                    href={`/manage/cmdb/edit/${resource.id}`}
                    variant="filled"
                    color="red"
                    aria-label={t("page.edit.title")}
                  >
                    <IconPencil {...iconProps} />
                  </ActionIcon>
                  <CmdbDeleteButton resource={resource} />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
};
