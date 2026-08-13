import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManageContainer } from "~/components/manage/manage-container";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { CmdbNewForm } from "./_cmdb-new-form";

export default async function CmdbNewPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const t = await getI18n();

  return (
    <ManageContainer>
      <DynamicBreadcrumb />
      <Stack>
        <Title>{t("cmdb.page.create.title")}</Title>
        <CmdbNewForm />
      </Stack>
    </ManageContainer>
  );
}
