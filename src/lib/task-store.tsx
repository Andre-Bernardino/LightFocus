import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useAuth } from "./auth";
import { getSupabaseExternal } from "./supabase-external";
import { newId, type Status, type Task, type TaskInput, type TaskStep } from "./tasks";

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "hydrate"; tasks: Task[] }
  | { type: "add"; task: Task }
  | { type: "update"; id: string; input: TaskInput }
  | { type: "remove"; id: string }
  | { type: "setStatus"; id: string; status: Status }
  | { type: "toggleStep"; taskId: string; stepId: string }
  | { type: "setSteps"; taskId: string; steps: TaskStep[] };

function reducer(state: Task[], action: Action): Task[] {
  switch (action.type) {
    case "hydrate":
      return action.tasks;

    case "add":
      return [action.task, ...state];

    case "update":
      return state.map((t) =>
        t.id === action.id ? { ...t, ...action.input } : t
      );

    case "remove":
      return state.filter((t) => t.id !== action.id);

    case "setStatus":
      return state.map((t) =>
        t.id === action.id
          ? {
              ...t,
              status: action.status,
              startedAt:
                action.status === "em_andamento"
                  ? (t.startedAt ?? new Date().toISOString())
                  : action.status === "pendente"
                    ? null
                    : (t.startedAt ?? null),
              completedAt:
                action.status === "concluida"
                  ? new Date().toISOString()
                  : null,
              steps:
                action.status === "concluida"
                  ? t.steps.map((s) => ({ ...s, done: true }))
                  : t.steps,
            }
          : t
      );

    case "toggleStep":
      return state.map((t) => {
        if (t.id !== action.taskId) return t;

        const updatedSteps = t.steps.map((s) =>
          s.id === action.stepId ? { ...s, done: !s.done } : s
        );

        // 🔥 AUTO-CONCLUI SE TODOS STEPS OK
        const allDone = updatedSteps.every((s) => s.done);

        return {
          ...t,
          steps: updatedSteps,
          status: allDone ? "concluida" : t.status,
          completedAt: allDone ? new Date().toISOString() : t.completedAt,
        };
      });

    case "setSteps":
      return state.map((t) =>
        t.id === action.taskId ? { ...t, steps: action.steps } : t
      );
  }
}

// ---------------------------------------------------------------------------
// Supabase Sync
// ---------------------------------------------------------------------------

function taskToRow(t: Task, userId: string | null) {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    energy: t.energy,
    estimated_minutes: t.estimatedMinutes,
    created_at: t.createdAt,
    started_at: t.startedAt ?? null,
    completed_at: t.completedAt,
  };
}

function stepsToRows(t: Task) {
  return t.steps.map((s) => ({
    id: s.id,
    task_id: t.id,
    title: s.title,
    done: s.done,
    position: s.position,
  }));
}

function mirrorSave(task: Task) {
  void (async () => {
    const db = await getSupabaseExternal();
    if (!db) return;

    const { data: auth } = await db.auth.getUser();
    const userId = auth.user?.id ?? null;
    if (!userId) return; // sem sessão o banco recusa a escrita

    const { error } = await db.from("tasks").upsert(taskToRow(task, userId));
    if (error) {
      console.error("Supabase sync:", error);
      toast.error(`Não salvou no banco: ${error.message}`);
      return;
    }
    await db.from("task_steps").delete().eq("task_id", task.id);

    const rows = stepsToRows(task);
    if (rows.length > 0) {
      await db.from("task_steps").insert(rows);
    }
  })().catch((e) => console.error("Supabase sync:", e));
}

function mirrorDelete(id: string) {
  void (async () => {
    const db = await getSupabaseExternal();
    if (!db) return;

    await db.from("tasks").delete().eq("id", id);
  })().catch((e) => console.error("Supabase sync:", e));
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TasksContextValue {
  tasks: Task[];
  addTask: (input: TaskInput) => string;
  updateTask: (id: string, input: TaskInput) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  startTask: (id: string) => void;
  toggleStep: (taskId: string, stepId: string) => void;
  setSteps: (taskId: string, stepTitles: string[]) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [tasks, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    let cancelled = false;

    // Espera a sessão resolver: sem usuário logado o banco recusa a leitura.
    if (loading) return;
    if (!user) {
      dispatch({ type: "hydrate", tasks: [] });
      return;
    }


    void (async () => {
      try {
        const db = await getSupabaseExternal();
        if (!db || cancelled) return;

        const { data: rows, error } = await db
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase load:", error);
          toast.error(`Não carregou do banco: ${error.message}`);
          return;
        }


        if (!rows || rows.length === 0) {
          if (!cancelled) dispatch({ type: "hydrate", tasks: [] });
          return;
        }

        const taskRows = rows as Record<string, any>[];
        const ids = taskRows.map((r) => r["id"] as string);

        const { data: stepRows } = await db.from("task_steps").select("*").in("task_id", ids);
        const steps = (stepRows ?? []) as Record<string, any>[];

        const mapped: Task[] = taskRows.map((r) => ({
          id: r["id"],
          title: r["title"],
          description: r["description"] ?? "",
          priority: r["priority"],
          status: r["status"],
          energy: r["energy"],
          estimatedMinutes: r["estimated_minutes"] ?? 15,
          createdAt: r["created_at"],
          startedAt: r["started_at"] ?? null,
          completedAt: r["completed_at"] ?? null,
          steps: steps
            .filter((s) => s["task_id"] === r["id"])
            .map((s) => ({
              id: s["id"],
              title: s["title"],
              done: s["done"],
              position: s["position"] ?? 0,
            })),
        }));

        if (!cancelled) {
          dispatch({ type: "hydrate", tasks: mapped });
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  const find = useCallback(
    (id: string) => tasks.find((t) => t.id === id),
    [tasks]
  );

  const addTask = useCallback((input: TaskInput) => {
    const task: Task = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      steps: [],
    };

    dispatch({ type: "add", task });
    mirrorSave(task);

    return task.id;
  }, []);

  const updateTask = useCallback(
    (id: string, input: TaskInput) => {
      dispatch({ type: "update", id, input });
      const t = find(id);
      if (t) mirrorSave({ ...t, ...input });
    },
    [find]
  );

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: "remove", id });
    mirrorDelete(id);
  }, []);

  const toggleComplete = useCallback(
    (id: string) => {
      const t = find(id);
      if (!t) return;

      const next: Status =
        t.status === "concluida" ? "pendente" : "concluida";

      dispatch({ type: "setStatus", id, status: next });

      mirrorSave({
        ...t,
        status: next,
        completedAt:
          next === "concluida" ? new Date().toISOString() : null,
      });
    },
    [find]
  );

  const startTask = useCallback(
    (id: string) => {
      const t = find(id);
      if (!t || t.status === "em_andamento") return;

      const startedAt = t.startedAt ?? new Date().toISOString();
      dispatch({ type: "setStatus", id, status: "em_andamento" });
      mirrorSave({ ...t, status: "em_andamento", startedAt });

      const hora = new Date(startedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      toast.success(`Começou às ${hora}. Foco em uma coisa só. 💪`);
    },
    [find]
  );

  // 🔥 CORRIGIDO DE VERDADE
  const toggleStep = useCallback(
    (taskId: string, stepId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedSteps = task.steps.map((s) =>
        s.id === stepId ? { ...s, done: !s.done } : s
      );

      const updatedTask: Task = {
        ...task,
        steps: updatedSteps,
      };

      dispatch({ type: "toggleStep", taskId, stepId });
      mirrorSave(updatedTask);
    },
    [tasks]
  );

  const setSteps = useCallback(
    (taskId: string, stepTitles: string[]) => {
      const steps: TaskStep[] = stepTitles.map((title, i) => ({
        id: newId(),
        title,
        done: false,
        position: i,
      }));

      dispatch({ type: "setSteps", taskId, steps });

      const t = find(taskId);
      if (t) mirrorSave({ ...t, steps });
    },
    [find]
  );

  const value = useMemo(
    () => ({
      tasks,
      addTask,
      updateTask,
      deleteTask,
      toggleComplete,
      startTask,
      toggleStep,
      setSteps,
    }),
    [tasks, addTask, updateTask, deleteTask, toggleComplete, startTask, toggleStep, setSteps]
  );

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasks deve estar dentro do provider");
  }
  return ctx;
}