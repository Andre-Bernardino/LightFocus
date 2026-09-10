import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  buildDecomposeMessages,
  buildRecommendMessages,
  heuristicRecommend,
  heuristicSteps,
  parseJsonFromAi,
  type Recommendation,
} from "./ai-logic";
import { callAiGateway } from "./ai-gateway.server";
import type { Task } from "./tasks";

const checkInSchema = z.object({
  energy: z.enum(["baixa", "media", "alta"]),
  mood: z.enum(["otimo", "bem", "neutro", "ansioso", "sobrecarregado"]),
  availableMinutes: z.number().min(5).max(480),
  priorities: z.string().max(1000).optional(),
});

const taskSnapshotSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["baixa", "media", "alta"]),
  status: z.enum(["pendente", "em_andamento", "concluida"]),
  energy: z.enum(["baixa", "media", "alta"]),
  estimatedMinutes: z.number(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      done: z.boolean(),
      position: z.number(),
    }),
  ),
});

/** Recomenda a melhor tarefa para o momento, com base no check-in (energia, humor, tempo). */
export const recommendTask = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ checkIn: checkInSchema, tasks: z.array(taskSnapshotSchema) }).parse(data),
  )
  .handler(async ({ data }): Promise<Recommendation | null> => {
    const fallback = heuristicRecommend(data.checkIn, data.tasks as Task[]);
    const open = data.tasks.filter((t) => t.status !== "concluida");
    if (open.length === 0) return null;

    const raw = await callAiGateway(buildRecommendMessages(data.checkIn, data.tasks as Task[]));
    if (!raw) return fallback;

    const parsed = parseJsonFromAi<{ task_id?: string; reason?: string; first_step?: string }>(raw);
    if (!parsed?.task_id || !open.some((t) => t.id === parsed.task_id)) return fallback;

    return {
      taskId: parsed.task_id,
      reason: parsed.reason || fallback?.reason || "Esta é a tarefa com melhor encaixe para agora.",
      firstStep: parsed.first_step || fallback?.firstStep || "Dar o primeiro passo, por menor que seja.",
    };
  });

/** Decompõe uma tarefa em 3-6 micro-passos acionáveis. */
export const decomposeTask = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        title: z.string().min(1),
        description: z.string(),
        estimatedMinutes: z.number(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ steps: string[] }> => {
    const raw = await callAiGateway(buildDecomposeMessages(data));
    if (!raw) return { steps: heuristicSteps(data.title) };

    const parsed = parseJsonFromAi<{ steps?: unknown }>(raw);
    if (!parsed?.steps || !Array.isArray(parsed.steps)) {
      return { steps: heuristicSteps(data.title) };
    }

    const steps = parsed.steps
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 6);

    return { steps: steps.length > 0 ? steps : heuristicSteps(data.title) };
  });
