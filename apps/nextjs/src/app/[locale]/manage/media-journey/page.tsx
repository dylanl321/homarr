import { redirect } from "next/navigation";
import { z } from "zod/v4";

import { auth } from "@homarr/auth/next";
import type { inferSearchParamsFromSchema } from "@homarr/common/types";
import { getScopedI18n } from "@homarr/translation/server";
import { SearchInput } from "@homarr/ui";
import { MediaJourneyExplorer } from "@homarr/widgets/media-journey";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MediaJourneyRunCorrelationButton } from "./_run-correlation-button";

const searchParamsSchema = z.object({
  search: z.string().optional(),
});

interface MediaJourneyPageProps {
  searchParams: Promise<inferSearchParamsFromSchema<typeof searchParamsSchema>>;
}

export default async function MediaJourneyPage(props: MediaJourneyPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  if (!session.user.permissions.includes("admin")) {
    redirect("/");
  }

  const searchParams = searchParamsSchema.parse(await props.searchParams);
  const t = await getScopedI18n("mediaJourney");

  return (
    <ManagePageLayout
      title={t("page.list.title")}
      primaryAction={<MediaJourneyRunCorrelationButton />}
      toolbar={
        <SearchInput placeholder={t("page.list.searchPlaceholder")} defaultValue={searchParams.search} flexExpand />
      }
    >
      <MediaJourneyExplorer search={searchParams.search} limit={200} viewMode="auto" layout="manage" />
    </ManagePageLayout>
  );
}
