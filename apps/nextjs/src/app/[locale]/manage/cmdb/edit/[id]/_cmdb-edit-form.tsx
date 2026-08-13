"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { TranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import { CmdbResourceForm, parseCmdbTags } from "../../_cmdb-resource-form";
import type { CmdbResourceFormValues } from "../../_cmdb-resource-form";

interface CmdbEditFormProps {
  resource: RouterOutputs["cmdb"]["getResource"];
}

const parseStoredTags = (tags: string) => {
  try {
    const parsed: unknown = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === "string").join(", ") : "";
  } catch {
    return "";
  }
};

export const CmdbEditForm = ({ resource }: CmdbEditFormProps) => {
  const t = useScopedI18n("cmdb.page.edit.notification");
  const router = useRouter();
  const { mutate, isPending } = clientApi.cmdb.updateResource.useMutation({
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
        id: resource.id,
        name: values.name,
        kind: values.kind,
        description: values.description.trim() || undefined,
        tags: parseCmdbTags(values.tags),
      });
    },
    [mutate, resource.id],
  );

  const submitButtonTranslation = useCallback(
    (tCommon: TranslationFunction) => tCommon("common.action.saveChanges"),
    [],
  );

  return (
    <CmdbResourceForm
      initialValues={{
        name: resource.name,
        kind: resource.kind,
        description: resource.description ?? "",
        tags: parseStoredTags(resource.tags),
      }}
      submitButtonTranslation={submitButtonTranslation}
      handleSubmit={handleSubmit}
      isPending={isPending}
    />
  );
};
