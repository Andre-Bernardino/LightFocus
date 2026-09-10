import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { decomposeTask } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import type { Task, TaskInput } from "@/lib/tasks";

const emptyInput: TaskInput = {
  title: "",
  description: "",
  priority: "media",
  status: "pendente",
  energy: "media",
  estimatedMinutes: 25,
};

interface TaskFormProps {
  onSubmit: (input: TaskInput, steps?: string[]) => void;
  editingTask?: Task | null;
  onCancel?: () => void;
  trigger?: React.ReactNode;
}

export function TaskForm({ onSubmit, editingTask, onCancel, trigger }: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<TaskInput>(editingTask ? { ...editingTask } : emptyInput);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const decompose = useServerFn(decomposeTask);

  const isEditing = Boolean(editingTask);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.title.trim()) return;
    onSubmit(input);
    if (!isEditing) {
      setInput(emptyInput);
      setOpen(false);
    } else {
      onCancel?.();
    }
  }

  async function handleDecompose() {
    if (!input.title.trim()) return;
    setIsDecomposing(true);
    try {
      const result = await decompose({
        data: {
          title: input.title,
          description: input.description,
          estimatedMinutes: input.estimatedMinutes,
        },
      });
      onSubmit(input, result.steps);
      setInput(emptyInput);
      setOpen(false);
    } finally {
      setIsDecomposing(false);
    }
  }

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={input.title}
          onChange={(e) => setInput((i) => ({ ...i, title: e.target.value }))}
          placeholder="Ex: Responder e-mails pendentes"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={input.description}
          onChange={(e) => setInput((i) => ({ ...i, description: e.target.value }))}
          placeholder="O que precisa ser feito? (opcional)"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select
            value={input.priority}
            onValueChange={(v) => setInput((i) => ({ ...i, priority: v as TaskInput["priority"] }))}
          >
            <SelectTrigger id="priority">
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
          <Label htmlFor="energy">Energia necessária</Label>
          <Select
            value={input.energy}
            onValueChange={(v) => setInput((i) => ({ ...i, energy: v as TaskInput["energy"] }))}
          >
            <SelectTrigger id="energy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minutes">Tempo estimado (minutos)</Label>
        <Input
          id="minutes"
          type="number"
          min={5}
          max={480}
          value={input.estimatedMinutes}
          onChange={(e) =>
            setInput((i) => ({ ...i, estimatedMinutes: Number(e.target.value) || 5 }))
          }
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {isEditing ? (
          <>
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Salvar alterações
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleDecompose}
              disabled={isDecomposing || !input.title.trim()}
              className="w-full gap-1.5 sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {isDecomposing ? "Decompondo..." : "Decompor com IA"}
            </Button>
            <Button type="submit" disabled={!input.title.trim()} className="w-full sm:w-auto">
              Adicionar tarefa
            </Button>
          </>
        )}
      </div>
    </form>
  );

  if (isEditing) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-4">{formBody}</CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
