import "server-only";

import { randomUUID } from "crypto";

import { getRedis } from "@/lib/redis";

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  underlyingSymbol?: string | null;
  color?: string | null;
  baseCurrency: string;
  riskProfile: "conservative" | "balanced" | "aggressive" | null;
  createdAt: string;
  updatedAt: string;
};

export type Position = {
  id: string;
  projectId: string;
  name?: string;
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
  pricingMode: "market" | "model";
  underlyingSymbol?: string;
  underlyingPrice?: number;
  strike?: number;
  expiry?: string;
  volatility?: number;
  rate?: number;
  dividendYield?: number;
  ratio?: number;
  marketPrice?: number;
  computed?: {
    fairValue: number;
    intrinsicValue: number;
    timeValue: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv?: number;
    asOf: string;
  };
  timeValueCurve?: Array<{ day: number; value: number }>;
  createdAt: string;
  updatedAt: string;
};

type RiskProfile = NonNullable<Project["riskProfile"]>;

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

async function deleteProjectPositions(redis: ReturnType<typeof getRedis>, projectId: string) {
  const ids = await redis.zrange<string[]>(projectPositionsKey(projectId), 0, 1000, {
    rev: false,
  });
  if (!ids || ids.length === 0) return;

  await Promise.all(ids.map((id) => redis.del(positionKey(id))));
  await redis.del(projectPositionsKey(projectId));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computePositionRiskScore(position: Position, now: Date) {
  const volatility = position.volatility ?? 0.3;
  const volFactor = clamp(volatility / 0.6, 0, 1);

  let timeFactor = 0.5;
  if (position.expiry) {
    const expiryMs = Date.parse(position.expiry);
    if (Number.isFinite(expiryMs)) {
      const days = Math.max(0, (expiryMs - now.getTime()) / (1000 * 60 * 60 * 24));
      timeFactor = 1 - clamp(days / 365, 0, 1);
    }
  }

  let moneynessPenalty = 0.5;
  if (position.underlyingPrice && position.strike) {
    const ratio =
      position.side === "call"
        ? position.underlyingPrice / position.strike
        : position.strike / position.underlyingPrice;
    moneynessPenalty = clamp(1 - ratio, 0, 1);
  }

  const leverageRaw = position.ratio ?? 1;
  const leverageFactor = clamp(leverageRaw / 5, 0, 1);
  const sizeFactor = clamp(Math.log10(position.size + 1) / 2, 0, 1);
  const pricingPenalty = position.pricingMode === "model" ? 0.1 : 0;

  const score =
    0.4 * volFactor +
    0.25 * timeFactor +
    0.2 * moneynessPenalty +
    0.1 * leverageFactor +
    0.05 * pricingPenalty +
    0.05 * sizeFactor;

  return clamp(score * 100, 0, 100);
}

function riskProfileFromScore(score: number): RiskProfile {
  if (score < 35) return "conservative";
  if (score < 65) return "balanced";
  return "aggressive";
}

async function updateProjectRiskProfile(
  redis: ReturnType<typeof getRedis>,
  project: Project,
  positions: Position[]
) {
  if (positions.length === 0) {
    return project;
  }

  const now = new Date();
  const weighted = positions.map((position) => {
    const weight = Math.max(1, Math.sqrt(position.size));
    return { score: computePositionRiskScore(position, now), weight };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = weighted.reduce((sum, item) => sum + item.score * item.weight, 0);
  const averageScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  const nextProfile = riskProfileFromScore(averageScore);
  if (project.riskProfile === nextProfile) {
    return project;
  }

  const updatedProject = { ...project, riskProfile: nextProfile };
  await redis.set(projectKey(project.id), updatedProject);
  return updatedProject;
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
    description?: string | null;
    underlyingSymbol?: string | null;
    color?: string | null;
  }
) {
  const redis = getRedis();
  const now = new Date().toISOString();
  const projectId = randomUUID();
  const project: Project = {
    id: projectId,
    ownerId: userId,
    name: input.name,
    description: input.description ?? null,
    underlyingSymbol: input.underlyingSymbol ?? null,
    color: input.color ?? null,
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

export async function updateProject(
  userId: string,
  projectId: string,
  input: Partial<
    Pick<Project, "name" | "baseCurrency" | "description" | "underlyingSymbol" | "color">
  >
) {
  const redis = getRedis();
  const project = await getProject(userId, projectId);
  if (!project) return null;

  const now = new Date().toISOString();
  const updated: Project = {
    ...project,
    ...input,
    id: project.id,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    updatedAt: now,
  };

  await redis.set(projectKey(projectId), updated);
  await redis.zadd(userProjectsKey(userId), {
    score: Date.parse(now),
    member: projectId,
  });

  return updated;
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
    name?: string;
    isin: string;
    side: Position["side"];
    size: number;
    entryPrice: number;
    pricingMode: Position["pricingMode"];
    underlyingSymbol?: string;
    underlyingPrice?: number;
    strike?: number;
    expiry?: string;
    volatility?: number;
    rate?: number;
    dividendYield?: number;
    ratio?: number;
    marketPrice?: number;
    computed?: Position["computed"];
    timeValueCurve?: Position["timeValueCurve"];
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
    name: input.name,
    isin: input.isin,
    side: input.side,
    size: input.size,
    entryPrice: input.entryPrice,
    pricingMode: input.pricingMode,
    underlyingSymbol: input.underlyingSymbol,
    underlyingPrice: input.underlyingPrice,
    strike: input.strike,
    expiry: input.expiry,
    volatility: input.volatility,
    rate: input.rate,
    dividendYield: input.dividendYield,
    ratio: input.ratio,
    marketPrice: input.marketPrice,
    computed: input.computed,
    timeValueCurve: input.timeValueCurve,
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(positionKey(positionId), position);
  await redis.zadd(projectPositionsKey(projectId), {
    score: Date.parse(now),
    member: positionId,
  });
  const updatedProject = { ...project, updatedAt: now };
  await redis.set(projectKey(projectId), updatedProject);

  const positions = await listPositions(projectId);
  await updateProjectRiskProfile(redis, updatedProject, positions);

  return position;
}

export async function getPosition(userId: string, projectId: string, positionId: string) {
  const redis = getRedis();
  const project = await getProject(userId, projectId);
  if (!project) return null;

  const position = await redis.get<Position>(positionKey(positionId));
  if (!position || position.projectId !== projectId) return null;
  return position;
}

export async function updatePosition(
  userId: string,
  projectId: string,
  positionId: string,
  input: Partial<Omit<Position, "id" | "projectId" | "createdAt">>
) {
  const redis = getRedis();
  const project = await getProject(userId, projectId);
  if (!project) return null;

  const position = await redis.get<Position>(positionKey(positionId));
  if (!position || position.projectId !== projectId) return null;

  const now = new Date().toISOString();
  const updated: Position = {
    ...position,
    ...input,
    id: position.id,
    projectId: position.projectId,
    createdAt: position.createdAt,
    updatedAt: now,
  };

  await redis.set(positionKey(positionId), updated);
  const updatedProject = { ...project, updatedAt: now };
  await redis.set(projectKey(projectId), updatedProject);

  const positions = await listPositions(projectId);
  await updateProjectRiskProfile(redis, updatedProject, positions);

  return updated;
}

export async function getPositionByIdForUser(userId: string, positionId: string) {
  const redis = getRedis();
  const position = await redis.get<Position>(positionKey(positionId));
  if (!position) return null;

  const project = await getProject(userId, position.projectId);
  if (!project) return null;

  return { position, project };
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
  const updatedProject = { ...project, updatedAt: new Date().toISOString() };
  await redis.set(projectKey(projectId), updatedProject);

  const positions = await listPositions(projectId);
  await updateProjectRiskProfile(redis, updatedProject, positions);

  return true;
}

export async function deleteProject(userId: string, projectId: string) {
  const redis = getRedis();
  const project = await getProject(userId, projectId);
  if (!project) return false;

  await deleteProjectPositions(redis, projectId);
  await redis.del(projectKey(projectId));
  await redis.zrem(userProjectsKey(userId), projectId);

  return true;
}
