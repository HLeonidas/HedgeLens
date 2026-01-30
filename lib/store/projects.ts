import "server-only";

import { randomUUID } from "crypto";

import { getRedis } from "@/lib/redis";

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  baseCurrency: string;
  riskProfile: "conservative" | "balanced" | "aggressive" | null;
  createdAt: string;
  updatedAt: string;
};

export type Position = {
  id: string;
  projectId: string;
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
  createdAt: string;
};

function projectKey(projectId: string) {
  return `project:${projectId}`;
}

function projectPositionsKey(projectId: string) {
  return `project:${projectId}:positions`;
}

function positionKey(positionId: string) {
  return `position:${positionId}`;
}

function userProjectsKey(userId: string) {
  return `user:${userId}:projects`;
}

export async function listProjects(userId: string, limit = 50) {
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(userProjectsKey(userId), 0, limit - 1, {
    rev: true,
  });

  if (!ids || ids.length === 0) return [];

  const projects = await Promise.all(
    ids.map((id) => redis.get<Project>(projectKey(id)))
  );

  return projects.filter((project): project is Project => Boolean(project));
}

export async function createProject(
  userId: string,
  input: {
    name: string;
    baseCurrency?: string;
    riskProfile?: Project["riskProfile"];
  }
) {
  const redis = getRedis();
  const now = new Date().toISOString();
  const projectId = randomUUID();
  const project: Project = {
    id: projectId,
    ownerId: userId,
    name: input.name,
    baseCurrency: input.baseCurrency ?? "EUR",
    riskProfile: input.riskProfile ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(projectKey(projectId), project);
  await redis.zadd(userProjectsKey(userId), {
    score: Date.parse(now),
    member: projectId,
  });

  return project;
}

export async function getProject(userId: string, projectId: string) {
  const redis = getRedis();
  const project = await redis.get<Project>(projectKey(projectId));
  if (!project) return null;
  if (project.ownerId !== userId) return null;
  return project;
}

export async function listPositions(projectId: string) {
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(projectPositionsKey(projectId), 0, 500, {
    rev: false,
  });

  if (!ids || ids.length === 0) return [];

  const positions = await Promise.all(
    ids.map((id) => redis.get<Position>(positionKey(id)))
  );

  return positions.filter((position): position is Position => Boolean(position));
}

export async function addPosition(
  userId: string,
  projectId: string,
  input: {
    isin: string;
    side: Position["side"];
    size: number;
    entryPrice: number;
  }
) {
  const redis = getRedis();
  const project = await getProject(userId, projectId);
  if (!project) return null;

  const now = new Date().toISOString();
  const positionId = randomUUID();
  const position: Position = {
    id: positionId,
    projectId,
    isin: input.isin,
    side: input.side,
    size: input.size,
    entryPrice: input.entryPrice,
    createdAt: now,
  };

  await redis.set(positionKey(positionId), position);
  await redis.zadd(projectPositionsKey(projectId), {
    score: Date.parse(now),
    member: positionId,
  });
  await redis.set(projectKey(projectId), { ...project, updatedAt: now });

  return position;
}

export async function deletePosition(
  userId: string,
  projectId: string,
  positionId: string
) {
  const redis = getRedis();
  const project = await getProject(userId, projectId);
  if (!project) return false;

  const position = await redis.get<Position>(positionKey(positionId));
  if (!position || position.projectId !== projectId) {
    return false;
  }

  await redis.del(positionKey(positionId));
  await redis.zrem(projectPositionsKey(projectId), positionId);
  await redis.set(projectKey(projectId), { ...project, updatedAt: new Date().toISOString() });

  return true;
}
