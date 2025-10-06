import axios from "axios";

const BASE_URL = "http://localhost:3000";

export type WorldPayload = {
  name: string;
  description: string;
};

export type World = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  userId: string;
};

export const ENTITY_RELATION_TYPES = [
  "ORIGIN",
  "FRIEND",
  "ENEMY",
  "AFFILIATE",
  "WIELDS",
] as const;

export type EntityRelationType = (typeof ENTITY_RELATION_TYPES)[number];

export type EntityRelations = Partial<Record<EntityRelationType, string[]>>;

export type EntityPayload = {
  name: string;
  entity_type: string;
  attributes: Record<string, string>;
};

export type UpdateEntityPayload = {
  name?: string;
  entity_type?: string;
};

export type UpdateEntityAttributesPayload = {
  attributes: Record<string, string>;
};

export type EntityRelationPayload = {
  targetEntityId: string;
  type: EntityRelationType;
};

export type Entity = {
  id: string;
  name: string;
  entity_type: string;
  attributes: Record<string, string>;
  relations: EntityRelations;
  worldId: string;
  created_at: string;
  updated_at: string;
  createdBy?: string;
};

function authHeader(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function fetchWorlds(token: string): Promise<World[]> {
  const { data } = await axios.get<World[]>(`${BASE_URL}/worlds`, authHeader(token));
  return data;
}

export async function createWorld(
  token: string,
  payload: WorldPayload
): Promise<World> {
  const { data } = await axios.post<World>(
    `${BASE_URL}/worlds`,
    payload,
    authHeader(token)
  );
  return data;
}

export async function fetchEntities(
  token: string,
  worldId: string
): Promise<Entity[]> {
  const { data } = await axios.get<Entity[]>(
    `${BASE_URL}/worlds/${worldId}/entities`,
    authHeader(token)
  );
  return data;
}

export async function createEntity(
  token: string,
  worldId: string,
  payload: EntityPayload
): Promise<Entity> {
  const { data } = await axios.post<Entity>(
    `${BASE_URL}/worlds/${worldId}/entities`,
    payload,
    authHeader(token)
  );
  return data;
}

export async function createEntityRelation(
  token: string,
  worldId: string,
  entityId: string,
  payload: EntityRelationPayload
): Promise<Entity> {
  const { data } = await axios.post<Entity>(
    `${BASE_URL}/worlds/${worldId}/entities/${entityId}/relations`,
    payload,
    authHeader(token)
  );
  return data;
}

export async function updateEntity(
  token: string,
  worldId: string,
  entityId: string,
  payload: UpdateEntityPayload
): Promise<Entity> {
  const { data } = await axios.patch<Entity>(
    `${BASE_URL}/worlds/${worldId}/entities/${entityId}`,
    payload,
    authHeader(token)
  );
  return data;
}

export async function updateEntityAttributes(
  token: string,
  worldId: string,
  entityId: string,
  payload: UpdateEntityAttributesPayload
): Promise<Entity> {
  const { data } = await axios.patch<Entity>(
    `${BASE_URL}/worlds/${worldId}/entities/${entityId}/attributes`,
    payload,
    authHeader(token)
  );
  return data;
}
