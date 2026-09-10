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

const DEFAULT_SETTINGS: RemindersSettings = {
  enabled: false,
  times: ["09:00", "14:00", "19:00"],
};

interface RemindersContextValue {
  settings: RemindersSettings;
  saveSettings: (next: RemindersSettings) => void;
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RemindersSettings>(DEFAULT_SETTINGS);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as RemindersSettings) });
    } catch {
      /* ignora */
    }
  }, []);

  const saveSettings = useCallback((next: RemindersSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignora */
    }
    if (next.enabled && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

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

  const value = useMemo(() => ({ settings, saveSettings }), [settings, saveSettings]);

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders deve ser usado dentro de <RemindersProvider>");
  return ctx;
}
