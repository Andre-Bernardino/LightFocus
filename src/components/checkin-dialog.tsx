import { useState } from "react";
import { HeartHandshake } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCheckIn } from "@/lib/checkin-store";
import type { CheckIn, Energy, Mood } from "@/lib/tasks";

interface Props {
  trigger?: React.ReactNode;
}

export function CheckInDialog({ trigger }: Props) {
  const { checkIn, saveCheckIn } = useCheckIn();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CheckIn>(
    checkIn ?? { energy: "media", mood: "neutro", availableMinutes: 30, priorities: "" },
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveCheckIn(form);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o check-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && checkIn) setForm(checkIn);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <HeartHandshake className="h-4 w-4" />
            Check-in
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Check-in de agora</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Responda rapidinho — com isso a LightFocus escolhe uma tarefa que combina com o seu momento.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ci-energy">Minha energia</Label>
              <Select
                value={form.energy}
                onValueChange={(v) => setForm((f) => ({ ...f, energy: v as Energy }))}
              >
                <SelectTrigger id="ci-energy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci-mood">Meu humor</Label>
              <Select
                value={form.mood}
                onValueChange={(v) => setForm((f) => ({ ...f, mood: v as Mood }))}
              >
                <SelectTrigger id="ci-mood">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otimo">Ótimo</SelectItem>
                  <SelectItem value="bem">Bem</SelectItem>
                  <SelectItem value="neutro">Neutro</SelectItem>
                  <SelectItem value="ansioso">Ansioso</SelectItem>
                  <SelectItem value="sobrecarregado">Sobrecarregado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-minutes">Tempo disponível agora (minutos)</Label>
            <Input
              id="ci-minutes"
              type="number"
              min={5}
              max={480}
              value={form.availableMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, availableMinutes: Number(e.target.value) || 5 }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-priorities">Prioridades de hoje</Label>
            <Textarea
              id="ci-priorities"
              rows={3}
              placeholder="Ex: entregar o relatório, ligar para a clínica"
              value={form.priorities ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, priorities: e.target.value }))}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar check-in"}
            </Button>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
