import { useState } from "react";
import { Bell, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useReminders } from "@/lib/reminders";

export function RemindersDialog() {
  const { settings, saveSettings } = useReminders();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [times, setTimes] = useState<string[]>(settings.times);
  const [newTime, setNewTime] = useState("");

  function addTime() {
    if (!/^\d{2}:\d{2}$/.test(newTime) || times.includes(newTime)) return;
    setTimes((t) => [...t, newTime].sort());
    setNewTime("");
  }

  function handleSave() {
    saveSettings({ enabled, times });
    setOpen(false);
    toast.success(
      enabled && times.length > 0
        ? `Lembretes ativos: ${times.join(", ")}`
        : "Lembretes desativados.",
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setEnabled(settings.enabled);
          setTimes(settings.times);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Lembretes">
          <Bell className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lembretes de revisão</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="rem-enabled">Ativar lembretes</Label>
              <p className="text-xs text-muted-foreground">
                Aviso no app (e notificação, se você permitir).
              </p>
            </div>
            <Switch id="rem-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Horários do meu dia</Label>
            <div className="flex flex-wrap gap-2">
              {times.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum horário definido.</p>
              )}
              {times.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTimes((prev) => prev.filter((x) => x !== t))}
                    aria-label={`Remover ${t}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-40"
              />
              <Button type="button" variant="outline" onClick={addTime} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>Salvar lembretes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
