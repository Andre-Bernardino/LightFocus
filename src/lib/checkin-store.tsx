import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useAuth } from "./auth";
import { getSupabaseExternal } from "./supabase-external";
import type { CheckIn } from "./tasks";

const STORAGE_KEY = "lightfocus.checkin";

interface StoredCheckIn extends CheckIn {
  date: string; // YYYY-MM-DD
  at: string; // ISO
}

function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storageKey(userId: string | undefined): string {
  return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY;
}

interface CheckInContextValue {
  checkIn: CheckIn | null;
  checkedInAt: string | null;
  isToday: boolean;
  saveCheckIn: (data: CheckIn) => Promise<void>;
  clearCheckIn: () => void;
}

const CheckInContext = createContext<CheckInContextValue | null>(null);

export function CheckInProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [stored, setStored] = useState<StoredCheckIn | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = storageKey(user?.id);

    try {
      const raw = localStorage.getItem(key);
      setStored(raw ? (JSON.parse(raw) as StoredCheckIn) : null);
    } catch {
      setStored(null);
    }

    if (!configured || !user) return;

    void (async () => {
      const db = await getSupabaseExternal();
      if (!db) return;

      const { data, error } = await db
        .from("check_ins")
        .select("energy,mood,available_minutes,priorities,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Check-in load:", error);
        toast.error(`Não carregou o check-in: ${error.message}`);
        return;
      }
      if (!data) return;

      const createdAt = String(data.created_at);
      const next: StoredCheckIn = {
        energy: data.energy as CheckIn["energy"],
        mood: data.mood as CheckIn["mood"],
        availableMinutes: Number(data.available_minutes),
        priorities: String(data.priorities ?? ""),
        date: new Date(createdAt).toLocaleDateString("en-CA"),
        at: createdAt,
      };
      setStored(next);
      localStorage.setItem(key, JSON.stringify(next));
    })().catch((error) => console.error("Check-in load:", error));

    return () => {
      cancelled = true;
    };
  }, [configured, user?.id]);

  const saveCheckIn = useCallback(async (data: CheckIn) => {
    const next: StoredCheckIn = { ...data, date: today(), at: new Date().toISOString() };
    const db = await getSupabaseExternal();

    if (configured) {
      if (!user || !db) throw new Error("Entre na sua conta para salvar o check-in.");

      const { error } = await db.from("check_ins").insert({
        user_id: user.id,
        energy: data.energy,
        mood: data.mood,
        available_minutes: data.availableMinutes,
        priorities: data.priorities ?? "",
        created_at: next.at,
      });
      if (error) throw new Error(`Não foi possível salvar o check-in: ${error.message}`);
    }

    setStored(next);
    localStorage.setItem(storageKey(user?.id), JSON.stringify(next));
  }, [configured, user]);

  const clearCheckIn = useCallback(() => {
    setStored(null);
    try {
      localStorage.removeItem(storageKey(user?.id));
    } catch {
      /* ignora */
    }
  }, [user?.id]);

  const value = useMemo<CheckInContextValue>(() => {
    const checkIn: CheckIn | null = stored
      ? {
          energy: stored.energy,
          mood: stored.mood,
          availableMinutes: stored.availableMinutes,
          priorities: stored.priorities ?? "",
        }
      : null;
    return {
      checkIn,
      checkedInAt: stored?.at ?? null,
      isToday: stored?.date === today(),
      saveCheckIn,
      clearCheckIn,
    };
  }, [stored, saveCheckIn, clearCheckIn]);

  return <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>;
}

export function useCheckIn(): CheckInContextValue {
  const ctx = useContext(CheckInContext);
  if (!ctx) throw new Error("useCheckIn deve ser usado dentro de <CheckInProvider>");
  return ctx;
}
