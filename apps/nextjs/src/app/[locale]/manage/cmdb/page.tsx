import { redirect } from "next/navigation";
import { z } from "zod/v4";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import type { inferSearchParamsFromSchema } from "@homarr/common/types";
import { getScopedI18n } from "@homarr/translation/server";
import { Link, SearchInput } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { CmdbResourceList } from "./_cmdb-resource-list";

const searchParamsSchema = z.object({
  search: z.string().optional(),
});

interface CmdbPageProps {
  searchParams: Promise<inferSearchParamsFromSchema<typeof searchParamsSchema>>;
}

export default async function CmdbPage(props: CmdbPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  if (!session.user.permissions.includes("admin")) {
    redirect("/");
  }

  const searchParams = searchParamsSchema.parse(await props.searchParams);
  const resources = await api.cmdb.listResources({
    search: searchParams.search,
    limit: 200,
  });
  const t = await getScopedI18n("cmdb");

  return (
    <ManagePageLayout
      title={t("page.list.title")}
      primaryAction={
        <MobileAffixButton component={Link} href="/manage/cmdb/new">
          {t("action.create")}
        </MobileAffixButton>
      }
      toolbar={
        <SearchInput placeholder={`${t("field.name.label")}...`} defaultValue={searchParams.search} flexExpand />
      }
      floatingPrimaryAction
    >
      <CmdbResourceList resources={resources} />
    </ManagePageLayout>
  );
}
