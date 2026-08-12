import { z } from "zod/v4";

export const cmdbResourceKinds = ["service", "host", "network", "storage", "app", "other"] as const;
export type CmdbResourceKind = (typeof cmdbResourceKinds)[number];

export const cmdbRelationshipKinds = ["depends_on", "runs_on", "connects_to", "owned_by", "related_to"] as const;
export type CmdbRelationshipKind = (typeof cmdbRelationshipKinds)[number];

export const cmdbOwnerTypes = ["user", "group"] as const;
export type CmdbOwnerType = (typeof cmdbOwnerTypes)[number];

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

export const createCmdbRelationshipSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  kind: z.enum(cmdbRelationshipKinds),
});

export const createCmdbOwnerSchema = z.object({
  resourceId: z.string().min(1),
  ownerType: z.enum(cmdbOwnerTypes),
  ownerId: z.string().min(1),
});
