"use client";

import { Button } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

export const MediaJourneyRunCorrelationButton = () => {
  const t = useScopedI18n("mediaJourney");
  const utils = clientApi.useUtils();
  const { mutate, isPending } = clientApi.mediaTrace.runCorrelation.useMutation({
    onSuccess: async (result) => {
      showSuccessNotification({
        title: t("notification.runCorrelation.success.title"),
        message: t("notification.runCorrelation.success.message", { count: result.upsertedCount }),
      });
      await utils.mediaTrace.list.invalidate();
    },
    onError: () => {
      showErrorNotification({
        title: t("notification.runCorrelation.error.title"),
        message: t("notification.runCorrelation.error.message"),
      });
    },
  });

  return (
    <Button leftSection={<IconPlayerPlay size={16} />} loading={isPending} onClick={() => mutate()}>
      {t("action.runCorrelation")}
    </Button>
  );
};
