import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Brain, CheckCircle2, ListTodo, LogOut, Moon, Plus, Sparkles, Sun } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "@/components/task-card";
import { TaskForm } from "@/components/task-form";
import { TaskStats } from "@/components/task-stats";
import { CheckInDialog } from "@/components/checkin-dialog";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { RemindersDialog } from "@/components/reminders-dialog";
import { decomposeTask } from "@/lib/ai.functions";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useTasks } from "@/lib/task-store";
import type { Status, Task, TaskInput } from "@/lib/tasks";

type Filter = "todas" | Status;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LightFocus — Tarefas para quem tem TDAH" },
      {
        name: "description",
        content:
          "Veja suas tarefas, filtre por status e adicione novas atividades no LightFocus.",
      },
      { property: "og:title", content: "LightFocus — Tarefas para quem tem TDAH" },
      {
        property: "og:description",
        content:
          "Veja suas tarefas, filtre por status e adicione novas atividades no LightFocus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Index,
});

function Index() {
  const { tasks, addTask, updateTask, deleteTask, toggleComplete, startTask, toggleStep, setSteps } =
    useTasks();
  const decompose = useServerFn(decomposeTask);
  const [filter, setFilter] = useState<Filter>("todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { user, loading, configured, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (configured && !loading && !user) void navigate({ to: "/auth" });
  }, [configured, loading, user, navigate]);

  const filteredTasks = useMemo(() => {
    if (filter === "todas") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "concluida"), [tasks]);

  function handleAdd(input: TaskInput, steps?: string[]) {
    const id = addTask(input);
    if (steps && steps.length > 0) {
      setSteps(id, steps);
    }
  }

  function handleUpdate(id: string, input: TaskInput) {
    updateTask(id, input);
    setEditingId(null);
  }

  async function handleDecompose(task: Task) {
    const result = await decompose({
      data: {
        title: task.title,
        description: task.description,
        estimatedMinutes: task.estimatedMinutes,
      },
    });
    setSteps(task.id, result.steps);
  }

  const editingTask = editingId ? tasks.find((t) => t.id === editingId) ?? null : null;

  if (configured && (loading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">LightFocus</h1>
              <p className="text-xs text-muted-foreground">Uma coisa de cada vez.</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <CheckInDialog />
            <RemindersDialog />
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
                aria-label="Sair da conta"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </header>

        <TaskStats tasks={tasks} />

        <RecommendationPanel />

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-full sm:w-auto">
              <TabsList className="grid h-10 w-full grid-cols-4 sm:w-auto sm:grid-cols-4">
                <TabsTrigger value="todas" className="gap-1.5 text-xs">
                  <ListTodo className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Todas</span>
                </TabsTrigger>
                <TabsTrigger value="pendente" className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pendentes</span>
                </TabsTrigger>
                <TabsTrigger value="em_andamento" className="gap-1.5 text-xs">
                  <Brain className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Andamento</span>
                </TabsTrigger>
                <TabsTrigger value="concluida" className="gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Concluídas</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <TaskForm onSubmit={handleAdd} />
          </div>

          <div className="mt-6 space-y-3">
            {filteredTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">
                    {filter === "todas"
                      ? "Nenhuma tarefa por aqui"
                      : "Nenhuma tarefa neste status"}
                  </h3>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    {filter === "todas"
                      ? "Adicione sua primeira tarefa para começar a organizar o dia."
                      : "Mude o filtro ou crie uma nova tarefa para vê-la aqui."}
                  </p>
                  {filter === "todas" && (
                    <TaskForm
                      onSubmit={handleAdd}
                      trigger={
                        <Button variant="outline" className="mt-4 gap-2">
                          <Plus className="h-4 w-4" />
                          Nova tarefa
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map((task) =>
                editingId === task.id ? (
                  <TaskForm
                    key={task.id}
                    editingTask={editingTask}
                    onSubmit={(input) => handleUpdate(task.id, input)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={toggleComplete}
                    onStart={startTask}
                    onDelete={deleteTask}
                    onEdit={() => setEditingId(task.id)}
                    onToggleStep={toggleStep}
                    onDecompose={handleDecompose}
                  />
                ),
              )
            )}
          </div>
        </section>

        {openTasks.length > 0 && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            {openTasks.length} {openTasks.length === 1 ? "tarefa aberta" : "tarefas abertas"}.
            Foque na próxima.
          </p>
        )}
      </div>
    </div>
  );
}
