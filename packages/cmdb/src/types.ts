import { z } from "zod/v4";

import { cmdbOwnerTypes, cmdbRelationshipKinds, cmdbResourceKinds } from "@homarr/definitions";

export { cmdbOwnerTypes, cmdbRelationshipKinds, cmdbResourceKinds };
export type { CmdbOwnerType, CmdbRelationshipKind, CmdbResourceKind } from "@homarr/definitions";

export const createCmdbResourceSchema = z.object({
  name: z.string().trim().min(1).max(256),
  kind: z.enum(cmdbResourceKinds),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const updateCmdbResourceSchema = createCmdbResourceSchema.partial().extend({
  id: z.string().min(1),
});

export const createCmdbRelationshipSchema = z
  .object({
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
    kind: z.enum(cmdbRelationshipKinds),
  })
  .refine((value) => value.sourceId !== value.targetId, {
    message: "source and target must be different resources",
    path: ["targetId"],
  });

export const createCmdbOwnerSchema = z.object({
  resourceId: z.string().min(1),
  ownerType: z.enum(cmdbOwnerTypes),
  ownerId: z.string().min(1),
});
