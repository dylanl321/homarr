import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { and, desc, eq } from "@homarr/db";
import { cmdbOwners, cmdbRelationships, cmdbResources } from "@homarr/db/schema";

import type {
  createCmdbOwnerSchema,
  createCmdbRelationshipSchema,
  createCmdbResourceSchema,
  updateCmdbResourceSchema,
} from "./types";
import type { z } from "zod/v4";

type CreateResourceInput = z.infer<typeof createCmdbResourceSchema>;
type UpdateResourceInput = z.infer<typeof updateCmdbResourceSchema>;
type CreateRelationshipInput = z.infer<typeof createCmdbRelationshipSchema>;
type CreateOwnerInput = z.infer<typeof createCmdbOwnerSchema>;

export const listCmdbResourcesAsync = async (db: Database, options?: { kind?: string; search?: string }) => {
  const resources = await db.query.cmdbResources.findMany({
    orderBy: [desc(cmdbResources.updatedAt)],
    with: {
      relationshipsFrom: true,
      relationshipsTo: true,
      owners: true,
    },
  });

  return resources.filter((resource) => {
    if (options?.kind && resource.kind !== options.kind) return false;
    if (options?.search) {
      const needle = options.search.toLowerCase();
      if (!resource.name.toLowerCase().includes(needle) && !(resource.description ?? "").toLowerCase().includes(needle)) {
        return false;
      }
    }
    return true;
  });
};

export const getCmdbResourceByIdAsync = async (db: Database, id: string) => {
  return await db.query.cmdbResources.findFirst({
    where: eq(cmdbResources.id, id),
    with: {
      relationshipsFrom: {
        with: {
          target: true,
        },
      },
      relationshipsTo: {
        with: {
          source: true,
        },
      },
      owners: true,
    },
  });
};

export const createCmdbResourceAsync = async (db: Database, input: CreateResourceInput) => {
  const id = createId();
  const now = new Date();
  await db.insert(cmdbResources).values({
    id,
    name: input.name,
    kind: input.kind,
    description: input.description ?? null,
    tags: JSON.stringify(input.tags),
    metadata: JSON.stringify(input.metadata),
    createdAt: now,
    updatedAt: now,
  });
  return await getCmdbResourceByIdAsync(db, id);
};

export const updateCmdbResourceAsync = async (db: Database, input: UpdateResourceInput) => {
  const existing = await db.query.cmdbResources.findFirst({
    where: eq(cmdbResources.id, input.id),
  });
  if (!existing) return null;

  await db
    .update(cmdbResources)
    .set({
      name: input.name ?? existing.name,
      kind: input.kind ?? existing.kind,
      description: input.description === undefined ? existing.description : input.description,
      tags: input.tags === undefined ? existing.tags : JSON.stringify(input.tags),
      metadata: input.metadata === undefined ? existing.metadata : JSON.stringify(input.metadata),
      updatedAt: new Date(),
    })
    .where(eq(cmdbResources.id, input.id));

  return await getCmdbResourceByIdAsync(db, input.id);
};

export const deleteCmdbResourceAsync = async (db: Database, id: string) => {
  await db.delete(cmdbResources).where(eq(cmdbResources.id, id));
};

export const createCmdbRelationshipAsync = async (db: Database, input: CreateRelationshipInput) => {
  const id = createId();
  await db.insert(cmdbRelationships).values({
    id,
    sourceId: input.sourceId,
    targetId: input.targetId,
    kind: input.kind,
    createdAt: new Date(),
  });
  return await db.query.cmdbRelationships.findFirst({
    where: eq(cmdbRelationships.id, id),
  });
};

export const deleteCmdbRelationshipAsync = async (db: Database, id: string) => {
  await db.delete(cmdbRelationships).where(eq(cmdbRelationships.id, id));
};

export const createCmdbOwnerAsync = async (db: Database, input: CreateOwnerInput) => {
  const existing = await db.query.cmdbOwners.findFirst({
    where: and(
      eq(cmdbOwners.resourceId, input.resourceId),
      eq(cmdbOwners.ownerType, input.ownerType),
      eq(cmdbOwners.ownerId, input.ownerId),
    ),
  });
  if (existing) return existing;

  const id = createId();
  await db.insert(cmdbOwners).values({
    id,
    resourceId: input.resourceId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    createdAt: new Date(),
  });
  return await db.query.cmdbOwners.findFirst({
    where: eq(cmdbOwners.id, id),
  });
};

export const deleteCmdbOwnerAsync = async (db: Database, id: string) => {
  await db.delete(cmdbOwners).where(eq(cmdbOwners.id, id));
};
