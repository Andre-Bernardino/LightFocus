import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const STORAGE_KEY = "lightfocus.reminders";

export interface RemindersSettings {
  enabled: boolean;
  /** Horários no formato "HH:MM". */
  times: string[];
}

export interface TaskReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  scheduledAt: string;
  message: string;
}

const DEFAULT_SETTINGS: RemindersSettings = {
  enabled: false,
  times: ["09:00", "14:00", "19:00"],
};

interface RemindersContextValue {
  settings: RemindersSettings;
  taskReminders: TaskReminder[];
  saveSettings: (next: RemindersSettings) => void;
  addTaskReminder: (reminder: Omit<TaskReminder, "id">) => void;
  removeTaskReminder: (id: string) => void;
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RemindersSettings>(DEFAULT_SETTINGS);
  const [taskReminders, setTaskReminders] = useState<TaskReminder[]>([]);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<RemindersSettings> & {
          taskReminders?: TaskReminder[];
        };
        setSettings({
          enabled: stored.enabled ?? DEFAULT_SETTINGS.enabled,
          times: stored.times ?? DEFAULT_SETTINGS.times,
        });
        setTaskReminders(stored.taskReminders ?? []);
      }
    } catch {
      /* ignora */
    }
  }, []);

  const persist = useCallback((nextSettings: RemindersSettings, nextReminders: TaskReminder[]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...nextSettings, taskReminders: nextReminders }),
      );
    } catch {
      /* ignora */
    }
  }, []);

  const saveSettings = useCallback(
    (next: RemindersSettings) => {
      setSettings(next);
      persist(next, taskReminders);
      if (
        next.enabled &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        void Notification.requestPermission();
      }
    },
    [persist, taskReminders],
  );

  const addTaskReminder = useCallback(
    (reminder: Omit<TaskReminder, "id">) => {
      const next = [...taskReminders, { ...reminder, id: crypto.randomUUID() }].sort((a, b) =>
        a.scheduledAt.localeCompare(b.scheduledAt),
      );
      setTaskReminders(next);
      persist(settings, next);
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    },
    [persist, settings, taskReminders],
  );

  const removeTaskReminder = useCallback(
    (id: string) => {
      const next = taskReminders.filter((reminder) => reminder.id !== id);
      setTaskReminders(next);
      persist(settings, next);
    },
    [persist, settings, taskReminders],
  );

  useEffect(() => {
    if (!settings.enabled || settings.times.length === 0) return;

    const check = () => {
      const current = nowHHMM();
      if (!settings.times.includes(current)) return;
      const key = `${new Date().toDateString()}-${current}`;
      if (fired.current.has(key)) return;
      fired.current.add(key);

      const message = "Hora de revisar suas tarefas pendentes no LightFocus.";
      toast.info("Lembrete do LightFocus", { description: message, duration: 10000 });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("LightFocus", { body: message });
      }
    };

    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, [settings]);

  useEffect(() => {
    if (taskReminders.length === 0) return;

    const check = () => {
      const now = Date.now();
      const due = taskReminders.filter(
        (reminder) => new Date(reminder.scheduledAt).getTime() <= now,
      );
      if (due.length === 0) return;

      due.forEach((reminder) => {
        toast.info(reminder.taskTitle, { description: reminder.message, duration: 10000 });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(reminder.taskTitle, { body: reminder.message });
        }
      });
      const next = taskReminders.filter((reminder) => !due.some((item) => item.id === reminder.id));
      setTaskReminders(next);
      persist(settings, next);
    };

    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, [persist, settings, taskReminders]);

  const value = useMemo(
    () => ({ settings, taskReminders, saveSettings, addTaskReminder, removeTaskReminder }),
    [settings, taskReminders, saveSettings, addTaskReminder, removeTaskReminder],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders deve ser usado dentro de <RemindersProvider>");
  return ctx;
}
