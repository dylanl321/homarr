export const cmdbResourceKinds = ["service", "host", "network", "storage", "app", "other"] as const;
export type CmdbResourceKind = (typeof cmdbResourceKinds)[number];

export const cmdbRelationshipKinds = ["depends_on", "runs_on", "connects_to", "owned_by", "related_to"] as const;
export type CmdbRelationshipKind = (typeof cmdbRelationshipKinds)[number];

export const cmdbOwnerTypes = ["user", "group"] as const;
export type CmdbOwnerType = (typeof cmdbOwnerTypes)[number];
