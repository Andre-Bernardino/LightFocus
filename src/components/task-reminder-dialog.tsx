import { useServerFn } from "@tanstack/react-start";
import { BellRing, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestTaskReminder } from "@/lib/ai.functions";
import { useReminders } from "@/lib/reminders";
import type { Task } from "@/lib/tasks";

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function TaskReminderDialog({ task }: { task: Task }) {
  const suggestReminder = useServerFn(suggestTaskReminder);
  const { addTaskReminder } = useReminders();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");

  async function suggest() {
    setLoading(true);
    try {
      const result = await suggestReminder({
        data: {
          title: task.title,
          description: task.description,
          estimatedMinutes: task.estimatedMinutes,
          priority: task.priority,
          energy: task.energy,
          nowIso: new Date().toISOString(),
        },
      });
      setScheduledAt(toLocalInput(result.scheduledAt));
      setMessage(result.message);
      setReason(result.reason);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível sugerir um horário.");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    const date = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(date.getTime()) || date <= new Date()) {
      toast.error("Escolha um horário futuro para o lembrete.");
      return;
    }
    addTaskReminder({
      taskId: task.id,
      taskTitle: task.title,
      scheduledAt: date.toISOString(),
      message: message.trim() || `Hora de continuar “${task.title}”.`,
    });
    toast.success("Lembrete criado.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5">
          <BellRing className="h-3.5 w-3.5" />
          Lembrar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lembrar: {task.title}</DialogTitle>
          <DialogDescription>Escolha o horário ou peça uma sugestão gentil à IA.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => void suggest()} disabled={loading}>
            <Sparkles className="h-4 w-4" />
            {loading ? "Pensando no melhor horário…" : "Sugerir com IA"}
          </Button>
          <div className="space-y-2">
            <Label htmlFor={`reminder-${task.id}`}>Data e horário</Label>
            <Input id={`reminder-${task.id}`} type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reminder-message-${task.id}`}>Mensagem</Label>
            <Input id={`reminder-message-${task.id}`} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Hora de continuar “${task.title}”.`} />
          </div>
          {reason && <p className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">{reason}</p>}
          <Button className="w-full" onClick={save}>Salvar lembrete</Button>
          <p className="text-center text-xs text-muted-foreground">O aviso aparece enquanto o LightFocus estiver aberto.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}