import { Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/tasks";

const POINTS_PER_TASK = 10;
const MILESTONE_STEP = 50;

interface ProgressCardProps {
  tasks: Task[];
}

export function ProgressCard({ tasks }: ProgressCardProps) {
  const done = tasks.filter((task) => task.status === "concluida").length;
  const points = done * POINTS_PER_TASK;
  const nextMilestone = Math.floor(points / MILESTONE_STEP) * MILESTONE_STEP + MILESTONE_STEP;
  const previousMilestone = nextMilestone - MILESTONE_STEP;
  const value = ((points - previousMilestone) / MILESTONE_STEP) * 100;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">Seu progresso</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {points} {points === 1 ? "ponto" : "pontos"} · próximo marco: {nextMilestone}
            </p>
          </div>
          <div className="rounded-lg bg-secondary p-2 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6">
          <Progress
            value={value}
            aria-label={`Progresso: ${points} de ${nextMilestone} pontos`}
            className="h-2.5"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {points}/{nextMilestone} pontos · cada tarefa concluída vale {POINTS_PER_TASK}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
