import type { CheckIn, Task } from "./tasks";

// ---------------------------------------------------------------------------
// Lógica de apoio da IA: heurísticas de fallback + construção de prompts.
// Puro (sem env, sem fetch) — seguro em qualquer bundle.
// ---------------------------------------------------------------------------

export interface Recommendation {
  taskId: string;
  reason: string;
  firstStep: string;
}

const PRIORITY_SCORE = { alta: 3, media: 2, baixa: 1 } as const;
const ENERGY_RANK = { baixa: 1, media: 2, alta: 3 } as const;

/** Fallback determinístico quando o gateway de IA não está disponível. */
export function heuristicRecommend(checkIn: CheckIn, tasks: Task[]): Recommendation | null {
  const open = tasks.filter((t) => t.status !== "concluida");
  if (open.length === 0) return null;

  const lowMood = checkIn.mood === "ansioso" || checkIn.mood === "sobrecarregado";

  const scored = open.map((t) => {
    let score = 0;
    const reasons: string[] = [];

    // Energia: tarefa não pode exigir mais energia do que a pessoa tem
    if (ENERGY_RANK[t.energy] <= ENERGY_RANK[checkIn.energy]) {
      score += 2;
      if (t.energy === checkIn.energy) {
        score += 1;
        reasons.push(`combina com sua energia ${checkIn.energy} agora`);
      }
    } else {
      score -= 3;
    }

    // Prioridade
    score += PRIORITY_SCORE[t.priority];
    if (t.priority === "alta") reasons.push("é prioridade alta");

    // Tempo disponível
    if (t.estimatedMinutes <= checkIn.availableMinutes) {
      score += 2;
      reasons.push(`cabe nos seus ${checkIn.availableMinutes} minutos`);
    } else {
      score -= 2;
    }

    // Humor baixo: preferir tarefas leves e curtas
    if (lowMood) {
      if (t.energy === "baixa") {
        score += 2;
        reasons.push("é leve, boa para um momento de sobrecarga");
      }
      if (t.estimatedMinutes <= 20) score += 1;
    }

    // Em andamento ganha empate (continuar é mais fácil que começar)
    if (t.status === "em_andamento") {
      score += 1;
      reasons.push("você já começou — retomar gasta menos energia");
    }

    return { task: t, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;

  const reason =
    best.reasons.length > 0
      ? `Escolhi "${best.task.title}" porque ${best.reasons.slice(0, 2).join(" e ")}.`
      : `"${best.task.title}" é a tarefa com melhor encaixe para este momento.`;

  return {
    taskId: best.task.id,
    reason,
    firstStep: best.task.steps.find((s) => !s.done)?.title ?? `Dar o primeiro passo em "${best.task.title}"`,
  };
}

/** Micro-passos de fallback quando a IA não está disponível. */
export function heuristicSteps(title: string): string[] {
  return [
    `Reunir o que preciso para "${title}" (2 min)`,
    `Fazer só a menor parte possível de "${title}" (5 min)`,
    "Respirar e marcar o que já avançou",
    `Continuar "${title}" em um bloco de 15 minutos`,
    "Revisar o resultado e considerar pronto (perfeito é inimigo do feito)",
  ];
}

// ---------------------------------------------------------------------------
// Prompts para o gateway de IA
// ---------------------------------------------------------------------------

export function buildRecommendMessages(checkIn: CheckIn, tasks: Task[]) {
  const open = tasks
    .filter((t) => t.status !== "concluida")
    .map((t) => ({
      id: t.id,
      titulo: t.title,
      prioridade: t.priority,
      energia_necessaria: t.energy,
      minutos_estimados: t.estimatedMinutes,
      status: t.status,
    }));

  return [
    {
      role: "system" as const,
      content:
        "Você é um coach de foco para pessoas com TDAH. Sua missão é escolher UMA tarefa para a pessoa fazer agora, reduzindo a paralisia de decisão. " +
        "Considere: energia atual, humor, tempo disponível, as prioridades declaradas do dia, prioridade da tarefa e o princípio de que começar pequeno vence a procrastinação. " +
        "Se a pessoa está ansiosa ou sobrecarregada, prefira tarefas leves e curtas. Responda APENAS com JSON válido, sem markdown: " +
        '{"task_id": string, "reason": string (1-2 frases em pt-BR, tom acolhedor e direto), "first_step": string (micro-passo de até 5 minutos, em pt-BR)}.',
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        check_in: {
          energia: checkIn.energy,
          humor: checkIn.mood,
          minutos_disponiveis: checkIn.availableMinutes,
          prioridades_do_dia: checkIn.priorities ?? "",
        },
        tarefas_abertas: open,
      }),
    },
  ];
}

export function buildDecomposeMessages(task: { title: string; description: string; estimatedMinutes: number }) {
  return [
    {
      role: "system" as const,
      content:
        "Você ajuda pessoas com TDAH a decompor tarefas em micro-passos acionáveis. " +
        "Gere de 3 a 6 passos: o primeiro deve ser ridículamente fácil (2-5 min) para destravar o início; cada passo deve começar com um verbo de ação e caber em até 15 minutos. " +
        "Responda APENAS com JSON válido, sem markdown: {" + '"steps": string[]' + "} (passos em pt-BR).",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        tarefa: task.title,
        descricao: task.description,
        minutos_estimados: task.estimatedMinutes,
      }),
    },
  ];
}

/** Extrai o primeiro objeto JSON de uma resposta de IA (tolera texto ao redor). */
export function parseJsonFromAi<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
