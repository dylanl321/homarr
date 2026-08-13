"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { TranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import { CmdbResourceForm, parseCmdbTags } from "../_cmdb-resource-form";
import type { CmdbResourceFormValues } from "../_cmdb-resource-form";

export const CmdbNewForm = () => {
  const t = useScopedI18n("cmdb.page.create.notification");
  const router = useRouter();
  const { mutate, isPending } = clientApi.cmdb.createResource.useMutation({
    onSuccess: async () => {
      showSuccessNotification({
        title: t("success.title"),
        message: t("success.message"),
      });
      await revalidatePathActionAsync("/manage/cmdb");
      router.push("/manage/cmdb");
    },
    onError: () => {
      showErrorNotification({
        title: t("error.title"),
        message: t("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: CmdbResourceFormValues) => {
      mutate({
        name: values.name,
        kind: values.kind,
        description: values.description.trim() || undefined,
        tags: parseCmdbTags(values.tags),
      });
    },
    [mutate],
  );

  const submitButtonTranslation = useCallback((tCommon: TranslationFunction) => tCommon("common.action.create"), []);

  return (
    <CmdbResourceForm
      submitButtonTranslation={submitButtonTranslation}
      handleSubmit={handleSubmit}
      isPending={isPending}
    />
  );
};
