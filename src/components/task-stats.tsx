import { CheckCircle2, Clock, ListTodo, Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/tasks";

interface TaskStatsProps {
  tasks: Task[];
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "pendente").length;
  const inProgress = tasks.filter((t) => t.status === "em_andamento").length;
  const done = tasks.filter((t) => t.status === "concluida").length;

  const stats = [
    { label: "Todas", value: total, icon: ListTodo, color: "text-foreground" },
    { label: "Pendentes", value: pending, icon: Clock, color: "text-status-progress" },
    { label: "Em andamento", value: inProgress, icon: Target, color: "text-primary" },
    { label: "Concluídas", value: done, icon: CheckCircle2, color: "text-status-done" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="transition-colors hover:bg-accent/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("rounded-lg bg-secondary p-2", stat.color)}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold leading-none">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
