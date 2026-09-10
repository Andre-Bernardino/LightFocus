import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Play,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ENERGY_LABELS, PRIORITY_LABELS, type Task } from "@/lib/tasks";

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onStart: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleStep: (taskId: string, stepId: string) => void;
  onDecompose: (task: Task) => Promise<void> | void;
}

const priorityClasses = {
  alta: "bg-priority-alta/15 text-priority-alta border-priority-alta/20",
  media: "bg-priority-media/15 text-priority-media border-priority-media/20",
  baixa: "bg-priority-baixa/15 text-priority-baixa border-priority-baixa/20",
};

export function TaskCard({
  task,
  onToggleComplete,
  onStart,
  onDelete,
  onEdit,
  onToggleStep,
  onDecompose,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(task.status === "em_andamento");
  const [isDecomposing, setIsDecomposing] = useState(false);

  // Ao iniciar a tarefa, os passos aparecem automaticamente
  useEffect(() => {
    if (task.status === "em_andamento") setExpanded(true);
  }, [task.status]);

  async function handleDecompose() {
    setIsDecomposing(true);
    try {
      await onDecompose(task);
      setExpanded(true);
    } finally {
      setIsDecomposing(false);
    }
  }
  const openSteps = task.steps.filter((s) => !s.done).length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? Math.round(((totalSteps - openSteps) / totalSteps) * 100) : 0;

  return (
    <Card
      className={cn(
        "group transition-all duration-200",
        task.status === "concluida" && "opacity-70",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === "concluida"}
            onCheckedChange={() => onToggleComplete(task.id)}
            className="mt-1 h-5 w-5 rounded-full border-2"
            aria-label={task.status === "concluida" ? "Reabrir tarefa" : "Concluir tarefa"}
          />

          <div className="min-w-0 flex-1">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full text-left"
              aria-expanded={expanded}
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={cn(
                    "font-display text-base font-semibold leading-tight",
                    task.status === "concluida" && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      priorityClasses[task.priority],
                    )}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
              </div>

              {task.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {task.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {task.estimatedMinutes} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  {ENERGY_LABELS[task.energy]}
                </span>
                {totalSteps > 0 && (
                  <span className="inline-flex items-center gap-1">
                    {openSteps === 0 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-done" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                    {totalSteps - openSteps}/{totalSteps} passos
                  </span>
                )}
                {task.startedAt && task.status !== "concluida" && (
                  <span className="inline-flex items-center gap-1 text-status-progress">
                    Iniciada às{" "}
                    {new Date(task.startedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </button>

            {expanded && totalSteps > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-3 animate-float-in">
                <p className="text-xs font-medium text-muted-foreground">Micro-passos</p>
                <ul className="space-y-2">
                  {task.steps.map((step) => (
                    <li key={step.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={step.done}
                        onCheckedChange={() => onToggleStep(task.id, step.id)}
                        className="mt-0.5 h-4 w-4"
                        aria-label={step.title}
                      />
                      <span className={cn(step.done && "text-muted-foreground line-through")}>
                        {step.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {task.status !== "concluida" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDecompose()}
                  disabled={isDecomposing}
                  className="h-8 gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isDecomposing
                    ? "Decompondo..."
                    : totalSteps > 0
                      ? "Refazer passos com IA"
                      : "Decompor com IA"}
                </Button>
              )}
              {task.status !== "concluida" && task.status !== "em_andamento" && (
                <Button size="sm" onClick={() => onStart(task.id)} className="h-8 gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Começar
                </Button>
              )}
              {task.status === "em_andamento" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-status-progress/15 px-2.5 py-1 text-xs font-medium text-status-progress">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-progress opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-status-progress" />
                  </span>
                  Em andamento
                </span>
              )}

              <div className="ml-auto flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(task)}
                  className="h-8 text-muted-foreground hover:text-foreground"
                >
                  Editar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onDelete(task.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
