import { describe, expect, test } from "vitest";

import { createDb } from "@homarr/db/test";

import { CmdbError } from "./errors";
import {
  createCmdbOwnerAsync,
  createCmdbRelationshipAsync,
  createCmdbResourceAsync,
  listCmdbResourcesAsync,
} from "./queries";

describe("cmdb queries", () => {
  test("filters and limits resources in the query", async () => {
    const db = createDb();
    await createCmdbResourceAsync(db, { name: "Plex", kind: "service", tags: [], metadata: {} });
    await createCmdbResourceAsync(db, { name: "TrueNAS", kind: "storage", tags: [], metadata: {} });
    await createCmdbResourceAsync(db, { name: "Proxmox", kind: "host", tags: [], metadata: {} });

    const services = await listCmdbResourcesAsync(db, { kind: "service" });
    expect(services).toHaveLength(1);
    expect(services[0]?.name).toBe("Plex");

    const searched = await listCmdbResourcesAsync(db, { search: "nas" });
    expect(searched).toHaveLength(1);
    expect(searched[0]?.name).toBe("TrueNAS");

    const limited = await listCmdbResourcesAsync(db, { limit: 1 });
    expect(limited).toHaveLength(1);
  });

  test("rejects self-loops, missing endpoints, and duplicate edges", async () => {
    const db = createDb();
    const plex = await createCmdbResourceAsync(db, { name: "Plex", kind: "service", tags: [], metadata: {} });
    const nas = await createCmdbResourceAsync(db, { name: "TrueNAS", kind: "storage", tags: [], metadata: {} });
    if (!plex || !nas) throw new Error("expected resources");

    await expect(
      createCmdbRelationshipAsync(db, { sourceId: plex.id, targetId: plex.id, kind: "depends_on" }),
    ).rejects.toBeInstanceOf(CmdbError);

    await expect(
      createCmdbRelationshipAsync(db, { sourceId: plex.id, targetId: "missing", kind: "depends_on" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const created = await createCmdbRelationshipAsync(db, {
      sourceId: plex.id,
      targetId: nas.id,
      kind: "depends_on",
    });
    const duplicate = await createCmdbRelationshipAsync(db, {
      sourceId: plex.id,
      targetId: nas.id,
      kind: "depends_on",
    });
    expect(duplicate?.id).toBe(created?.id);
  });

  test("rejects owners for missing resources and skips duplicate owners", async () => {
    const db = createDb();
    const plex = await createCmdbResourceAsync(db, { name: "Plex", kind: "service", tags: [], metadata: {} });
    if (!plex) throw new Error("expected resource");

    await expect(
      createCmdbOwnerAsync(db, { resourceId: "missing", ownerType: "user", ownerId: "user-1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const created = await createCmdbOwnerAsync(db, {
      resourceId: plex.id,
      ownerType: "user",
      ownerId: "user-1",
    });
    const duplicate = await createCmdbOwnerAsync(db, {
      resourceId: plex.id,
      ownerType: "user",
      ownerId: "user-1",
    });
    expect(duplicate?.id).toBe(created?.id);
  });
});
