import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

import {
  CmdbError,
  cmdbResourceKinds,
  createCmdbOwnerAsync,
  createCmdbOwnerSchema,
  createCmdbRelationshipAsync,
  createCmdbRelationshipSchema,
  createCmdbResourceAsync,
  createCmdbResourceSchema,
  deleteCmdbOwnerAsync,
  deleteCmdbRelationshipAsync,
  deleteCmdbResourceAsync,
  getCmdbResourceByIdAsync,
  listCmdbResourcesAsync,
  updateCmdbResourceAsync,
  updateCmdbResourceSchema,
} from "@homarr/cmdb";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../trpc";

const throwIfCmdbError = (error: unknown): never => {
  if (error instanceof CmdbError) {
    throw new TRPCError({ code: error.code, message: error.message });
  }
  throw error;
};

export const cmdbRouter = createTRPCRouter({
  listResources: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List CMDB resources with relationships and owners. OPTIONAL: kind (service|host|network|storage|app|other), search (string), limit (1-200, default 50)",
      },
    })
    .input(
      z
        .object({
          kind: z.enum(cmdbResourceKinds).optional(),
          search: z.string().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return await listCmdbResourcesAsync(ctx.db, input);
    }),

  getResource: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "Get a CMDB resource by ID including neighbors and owners. REQUIRED: id",
      },
    })
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const resource = await getCmdbResourceByIdAsync(ctx.db, input.id);
      if (!resource) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CMDB resource not found" });
      }
      return resource;
    }),

  createResource: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a CMDB resource. REQUIRED: name, kind. OPTIONAL: description, tags (string[]), metadata (object)",
      },
    })
    .input(createCmdbResourceSchema)
    .mutation(async ({ ctx, input }) => {
      return await createCmdbResourceAsync(ctx.db, input);
    }),

  updateResource: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Update a CMDB resource. REQUIRED: id. OPTIONAL: name, kind, description, tags, metadata",
      },
    })
    .input(updateCmdbResourceSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await updateCmdbResourceAsync(ctx.db, input);
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CMDB resource not found" });
      }
      return updated;
    }),

  deleteResource: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: { enabled: true, description: "Delete a CMDB resource by ID. REQUIRED: id" },
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCmdbResourceAsync(ctx.db, input.id);
    }),

  createRelationship: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a CMDB relationship. REQUIRED: sourceId, targetId, kind (depends_on|runs_on|connects_to|owned_by|related_to)",
      },
    })
    .input(createCmdbRelationshipSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCmdbRelationshipAsync(ctx.db, input);
      } catch (error) {
        throwIfCmdbError(error);
      }
    }),

  deleteRelationship: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: { enabled: true, description: "Delete a CMDB relationship by ID. REQUIRED: id" },
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCmdbRelationshipAsync(ctx.db, input.id);
    }),

  createOwner: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Assign an owner to a CMDB resource. REQUIRED: resourceId, ownerType (user|group), ownerId",
      },
    })
    .input(createCmdbOwnerSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCmdbOwnerAsync(ctx.db, input);
      } catch (error) {
        throwIfCmdbError(error);
      }
    }),

  deleteOwner: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: { enabled: true, description: "Remove a CMDB owner assignment by ID. REQUIRED: id" },
    })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCmdbOwnerAsync(ctx.db, input.id);
    }),
});
