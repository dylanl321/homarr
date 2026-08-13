"use client";

import { Button, Group, Select, Stack, TextInput, Textarea } from "@mantine/core";
import { z } from "zod/v4";

import { cmdbResourceKinds } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

const cmdbResourceFormSchema = z.object({
  name: z.string().trim().min(1).max(256),
  kind: z.enum(cmdbResourceKinds),
  description: z.string().trim().max(2000),
  tags: z.string(),
});

export type CmdbResourceFormValues = z.infer<typeof cmdbResourceFormSchema>;

interface CmdbResourceFormProps {
  initialValues?: CmdbResourceFormValues;
  submitButtonTranslation: (t: TranslationFunction) => string;
  handleSubmit: (values: CmdbResourceFormValues) => void;
  isPending: boolean;
}

export const CmdbResourceForm = ({
  initialValues,
  submitButtonTranslation,
  handleSubmit,
  isPending,
}: CmdbResourceFormProps) => {
  const t = useI18n();
  const tCmdb = useScopedI18n("cmdb");
  const form = useZodForm(cmdbResourceFormSchema, {
    initialValues: initialValues ?? {
      name: "",
      kind: "service",
      description: "",
      tags: "",
    },
  });

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label={tCmdb("field.name.label")} />
        <Select
          {...form.getInputProps("kind")}
          withAsterisk
          label={tCmdb("field.kind.label")}
          data={cmdbResourceKinds.map((kind) => ({ value: kind, label: kind }))}
        />
        <Textarea
          {...form.getInputProps("description")}
          label={tCmdb("field.description.label")}
          autosize
          minRows={2}
        />
        <TextInput
          {...form.getInputProps("tags")}
          label={tCmdb("field.tags.label")}
          description={tCmdb("field.tags.description")}
        />
        <Group justify="end">
          <Button component={Link} href="/manage/cmdb" variant="subtle">
            {t("common.action.backToOverview")}
          </Button>
          <Button type="submit" loading={isPending}>
            {submitButtonTranslation(t)}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

export const parseCmdbTags = (tags: string) =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
