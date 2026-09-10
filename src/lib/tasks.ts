// Tipos e rótulos do domínio de tarefas (LightFocus)

export type Priority = "baixa" | "media" | "alta";
export type Status = "pendente" | "em_andamento" | "concluida";
export type Energy = "baixa" | "media" | "alta";
export type Mood = "otimo" | "bem" | "neutro" | "ansioso" | "sobrecarregado";

export interface TaskStep {
  id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  energy: Energy;
  estimatedMinutes: number;
  createdAt: string;
  completedAt: string | null;
  startedAt?: string | null;
  steps: TaskStep[];
}

export interface CheckIn {
  energy: Energy;
  mood: Mood;
  availableMinutes: number;
  /** Prioridades do dia, em texto livre (opcional). */
  priorities?: string | undefined;
}

export interface TaskInput {
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  energy: Energy;
  estimatedMinutes: number;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const STATUS_LABELS: Record<Status, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export const ENERGY_LABELS: Record<Energy, string> = {
  baixa: "Energia baixa",
  media: "Energia média",
  alta: "Energia alta",
};

export const MOOD_LABELS: Record<Mood, string> = {
  otimo: "Ótimo",
  bem: "Bem",
  neutro: "Neutro",
  ansioso: "Ansioso",
  sobrecarregado: "Sobrecarregado",
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
