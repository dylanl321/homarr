import type { z } from "zod/v4";

import { createId } from "@homarr/common";
import type { Database, SQL } from "@homarr/db";
import { and, desc, eq, like, or, sql } from "@homarr/db";
import { cmdbOwners, cmdbRelationships, cmdbResources } from "@homarr/db/schema";

import { CmdbError } from "./errors";
import type {
  CmdbResourceKind,
  createCmdbOwnerSchema,
  createCmdbRelationshipSchema,
  createCmdbResourceSchema,
  updateCmdbResourceSchema,
} from "./types";

type CreateResourceInput = z.infer<typeof createCmdbResourceSchema>;
type UpdateResourceInput = z.infer<typeof updateCmdbResourceSchema>;
type CreateRelationshipInput = z.infer<typeof createCmdbRelationshipSchema>;
type CreateOwnerInput = z.infer<typeof createCmdbOwnerSchema>;

const sanitizeSearch = (value: string) => value.replaceAll(/[%_\\]/g, "").trim();

export const listCmdbResourcesAsync = async (
  db: Database,
  options?: { kind?: CmdbResourceKind; search?: string; limit?: number },
) => {
  const filters: SQL[] = [];

  if (options?.kind) {
    filters.push(eq(cmdbResources.kind, options.kind));
  }

  const search = options?.search ? sanitizeSearch(options.search) : "";
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    const searchFilter = or(
      like(sql`lower(${cmdbResources.name})`, pattern),
      like(sql`lower(${cmdbResources.description})`, pattern),
    );
    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  return await db.query.cmdbResources.findMany({
    where: filters.length > 0 ? and(...filters) : undefined,
    orderBy: [desc(cmdbResources.updatedAt)],
    limit: options?.limit ?? 50,
    with: {
      relationshipsFrom: true,
      relationshipsTo: true,
      owners: true,
    },
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
  if (input.sourceId === input.targetId) {
    throw new CmdbError("BAD_REQUEST", "A resource cannot relate to itself");
  }

  const [source, target] = await Promise.all([
    db.query.cmdbResources.findFirst({ where: eq(cmdbResources.id, input.sourceId) }),
    db.query.cmdbResources.findFirst({ where: eq(cmdbResources.id, input.targetId) }),
  ]);
  if (!source || !target) {
    throw new CmdbError("NOT_FOUND", "CMDB relationship source or target was not found");
  }

  const existing = await db.query.cmdbRelationships.findFirst({
    where: and(
      eq(cmdbRelationships.sourceId, input.sourceId),
      eq(cmdbRelationships.targetId, input.targetId),
      eq(cmdbRelationships.kind, input.kind),
    ),
  });
  if (existing) return existing;

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
  const resource = await db.query.cmdbResources.findFirst({
    where: eq(cmdbResources.id, input.resourceId),
  });
  if (!resource) {
    throw new CmdbError("NOT_FOUND", "CMDB resource not found");
  }

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
