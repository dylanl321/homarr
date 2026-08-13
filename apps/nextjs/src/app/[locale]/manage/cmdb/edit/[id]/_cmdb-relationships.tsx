"use client";

import { ActionIcon, Badge, Button, Group, Select, Stack, Table, Text, Title } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { cmdbRelationshipKinds } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

const relationshipFormSchema = z.object({
  targetId: z.string().min(1),
  kind: z.enum(cmdbRelationshipKinds),
});

interface CmdbRelationshipsProps {
  resource: RouterOutputs["cmdb"]["getResource"];
  resources: RouterOutputs["cmdb"]["listResources"];
}

export const CmdbRelationships = ({ resource, resources }: CmdbRelationshipsProps) => {
  const t = useScopedI18n("cmdb");
  const form = useZodForm(relationshipFormSchema, {
    initialValues: {
      targetId: "",
      kind: "depends_on",
    },
  });
  const utils = clientApi.useUtils();
  const { mutate: createRelationship, isPending: isCreating } = clientApi.cmdb.createRelationship.useMutation({
    onSuccess: async () => {
      showSuccessNotification({
        title: t("page.edit.notification.success.title"),
        message: t("page.edit.notification.success.message"),
      });
      form.setValues({ targetId: "", kind: "depends_on" });
      await Promise.all([
        revalidatePathActionAsync("/manage/cmdb"),
        utils.cmdb.getResource.invalidate({ id: resource.id }),
      ]);
    },
    onError: () => {
      showErrorNotification({
        title: t("page.edit.notification.error.title"),
        message: t("page.edit.notification.error.message"),
      });
    },
  });
  const { mutate: deleteRelationship } = clientApi.cmdb.deleteRelationship.useMutation({
    onSuccess: async () => {
      await Promise.all([
        revalidatePathActionAsync("/manage/cmdb"),
        utils.cmdb.getResource.invalidate({ id: resource.id }),
      ]);
    },
  });

  const otherResources = resources.filter((item) => item.id !== resource.id);
  const relationships = [
    ...resource.relationshipsFrom.map((relationship) => ({
      ...relationship,
      direction: "outbound" as const,
      otherName: relationship.target.name,
    })),
    ...resource.relationshipsTo.map((relationship) => ({
      ...relationship,
      direction: "inbound" as const,
      otherName: relationship.source.name,
    })),
  ];

  return (
    <Stack>
      <Title order={4}>{t("page.edit.relationships.title")}</Title>
      {relationships.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("page.edit.relationships.empty")}
        </Text>
      ) : (
        <Table striped withTableBorder>
          <Table.Tbody>
            {relationships.map((relationship) => (
              <Table.Tr key={relationship.id}>
                <Table.Td>
                  <Badge size="sm" variant="light">
                    {t(`page.edit.relationships.${relationship.direction}`)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{relationship.kind}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{relationship.otherName}</Text>
                </Table.Td>
                <Table.Td width={40}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t("page.delete.title")}
                    onClick={() => deleteRelationship({ id: relationship.id })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <form
        onSubmit={form.onSubmit((values) => {
          createRelationship({
            sourceId: resource.id,
            targetId: values.targetId,
            kind: values.kind,
          });
        })}
      >
        <Group align="flex-end">
          <Select
            {...form.getInputProps("targetId")}
            label={t("field.target.label")}
            data={otherResources.map((item) => ({ value: item.id, label: item.name }))}
            searchable
            style={{ flex: 1 }}
          />
          <Select
            {...form.getInputProps("kind")}
            label={t("field.relationshipKind.label")}
            data={cmdbRelationshipKinds.map((kind) => ({ value: kind, label: kind }))}
          />
          <Button type="submit" loading={isCreating}>
            {t("page.edit.relationships.add")}
          </Button>
        </Group>
      </form>
    </Stack>
  );
};
