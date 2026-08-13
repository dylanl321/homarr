import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManageContainer } from "~/components/manage/manage-container";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { CmdbEditForm } from "./_cmdb-edit-form";
import { CmdbRelationships } from "./_cmdb-relationships";

interface CmdbEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CmdbEditPage(props: CmdbEditPageProps) {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const { id } = await props.params;
  const [resource, resources] = await Promise.all([
    api.cmdb.getResource({ id }).catch(() => null),
    api.cmdb.listResources({ limit: 200 }),
  ]);

  if (!resource) {
    notFound();
  }

  const t = await getI18n();

  return (
    <ManageContainer>
      <DynamicBreadcrumb dynamicMappings={new Map([[id, resource.name]])} />
      <Stack>
        <Title>{t("cmdb.page.edit.title")}</Title>
        <CmdbEditForm resource={resource} />
        <CmdbRelationships resource={resource} resources={resources} />
      </Stack>
    </ManageContainer>
  );
}
