import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { HeartHandshake, Play, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckInDialog } from "@/components/checkin-dialog";
import { recommendTask } from "@/lib/ai.functions";
import { useCheckIn } from "@/lib/checkin-store";
import { useTasks } from "@/lib/task-store";
import { ENERGY_LABELS, MOOD_LABELS, type Task } from "@/lib/tasks";
import type { Recommendation } from "@/lib/ai-logic";

const REC_KEY = "lightfocus.recommendation";

interface StoredRec {
  signature: string;
  rec: Recommendation | null;
}

export function RecommendationPanel() {
  const { checkIn, checkedInAt, isToday } = useCheckIn();
  const { tasks, startTask } = useTasks();
  const recommend = useServerFn(recommendTask);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);

  // Cada check-in tem sua própria recomendação salva; ela só muda se eu pedir.
  const signature = checkIn
    ? `${checkedInAt ?? ""}|${checkIn.energy}|${checkIn.mood}|${checkIn.availableMinutes}`
    : "";

  const fetchRec = useCallback(async () => {
    if (!checkIn) return;
    setLoading(true);
    try {
      const result = await recommend({
        data: {
          checkIn: {
            energy: checkIn.energy,
            mood: checkIn.mood,
            availableMinutes: checkIn.availableMinutes,
            priorities: checkIn.priorities ?? "",
          },
          tasks: tasks.map((t) => ({ ...t, startedAt: t.startedAt ?? null })),
        },
      });
      setRec(result);
      try {
        localStorage.setItem(REC_KEY, JSON.stringify({ signature, rec: result } satisfies StoredRec));
      } catch {
        /* localStorage indisponível */
      }
    } catch {
      setRec(null);
    } finally {
      setLoading(false);
    }
  }, [checkIn, recommend, tasks, signature]);

  // Reaproveita a recomendação salva; só consulta a IA quando ainda não existe uma.
  useEffect(() => {
    if (!checkIn) return;
    let cached: StoredRec | null = null;
    try {
      const raw = localStorage.getItem(REC_KEY);
      cached = raw ? (JSON.parse(raw) as StoredRec) : null;
    } catch {
      cached = null;
    }
    if (cached && cached.signature === signature) {
      setRec(cached.rec);
      return;
    }
    void fetchRec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);


  if (!checkIn) {
    return (
      <Card className="mt-6 border-dashed border-primary/40 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Como você está agora?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Faça o check-in diário (energia, humor e prioridades) e eu escolho a tarefa ideal para
              este momento.
            </p>
          </div>
          <CheckInDialog
            trigger={
              <Button className="gap-2">
                <HeartHandshake className="h-4 w-4" />
                Fazer check-in
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const task: Task | undefined = rec ? tasks.find((t) => t.id === rec.taskId) : undefined;

  return (
    <Card className="mt-6 border-primary/30 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Recomendação para agora
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchRec()}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Atualizar
            </Button>
            <CheckInDialog
              trigger={
                <Button variant="ghost" size="sm">
                  Refazer check-in
                </Button>
              }
            />
          </div>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {ENERGY_LABELS[checkIn.energy]} · Humor: {MOOD_LABELS[checkIn.mood]} ·{" "}
          {checkIn.availableMinutes} min disponíveis
          {isToday ? "" : " · check-in de outro dia"}
        </p>

        {loading && !task ? (
          <p className="mt-4 text-sm text-muted-foreground">Escolhendo a melhor tarefa…</p>
        ) : task ? (
          <div className="mt-4">
            <h3 className="font-display text-xl font-bold leading-tight">{task.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{rec?.reason}</p>
            <p className="mt-3 rounded-lg bg-background/70 p-3 text-sm">
              <span className="font-medium">Primeiro passo: </span>
              {rec?.firstStep}
            </p>
            {task.status !== "em_andamento" && task.status !== "concluida" && (
              <Button className="mt-4 gap-2" onClick={() => startTask(task.id)}>
                <Play className="h-4 w-4" />
                Começar agora
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma tarefa aberta para recomendar. Aproveite a pausa. 🌿
          </p>
        )}
      </CardContent>
    </Card>
  );
}
