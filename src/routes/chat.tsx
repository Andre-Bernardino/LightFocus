import { useChat } from "@ai-sdk/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, Brain, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import focusCompanion from "@/assets/focus-companion.png";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCheckIn } from "@/lib/checkin-store";
import { useTasks } from "@/lib/task-store";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/chat")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { taskId?: string } => ({
    taskId: typeof search["taskId"] === "string" ? search["taskId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assistente de foco — LightFocus" },
      { name: "description", content: "Converse com a assistente de foco do LightFocus." },
      { property: "og:title", content: "Assistente de foco — LightFocus" },
      {
        property: "og:description",
        content: "Apoio acolhedor para organizar ideias e dar o próximo passo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { tasks } = useTasks();
  const { checkIn, isToday } = useCheckIn();
  const context = useMemo(
    () => ({
      tasks: tasks
        .filter((task) => task.status !== "concluida")
        .map(({ id, title, description, priority, energy, estimatedMinutes, status, steps }) => ({
          id,
          title,
          description,
          priority,
          energy,
          estimatedMinutes,
          status,
          steps: steps.filter((step) => !step.done).map((step) => step.title),
        })),
      checkIn: isToday ? checkIn : null,
    }),
    [checkIn, isToday, tasks],
  );
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({ body: { messages, context } }),
      }),
    [context],
  );
  const { messages, sendMessage, status, stop, error } = useChat({ transport });
  const { theme, toggleTheme } = useTheme();
  const { user, loading, configured } = useAuth();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (configured && !loading && !user) void navigate({ to: "/auth" });
  }, [configured, loading, user, navigate]);

  useEffect(() => {
    if (status === "ready" || status === "error") textareaRef.current?.focus();
  }, [status]);

  if (configured && (loading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/" aria-label="Voltar para tarefas" title="Voltar para tarefas">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Assistente LightFocus</h1>
              <p className="text-xs text-muted-foreground">Vamos encontrar o próximo passo.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      <div className="mx-auto flex h-[calc(100vh-65px)] w-full max-w-3xl flex-col px-4 sm:px-6">
        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-2xl py-8">
            {messages.length === 0 ? (
              <ConversationEmptyState className="min-h-[52vh]">
                <img
                  src={focusCompanion}
                  alt="Companheira de foco em forma de cérebro lilás"
                  width={1024}
                  height={1024}
                  className="h-28 w-28 object-contain"
                />
                <div className="mt-2 space-y-2">
                  <h2 className="font-display text-xl font-semibold">
                    O que está ocupando sua cabeça?
                  </h2>
                  <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    Pode contar do seu jeito. Eu vejo suas tarefas abertas e ajudo a organizar o
                    dia, criar lembretes e escolher um passo pequeno.
                  </p>
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent
                    className={
                      message.role === "user" ? "bg-primary text-primary-foreground" : undefined
                    }
                  >
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <MessageResponse key={`${message.id}-${index}`}>
                          {part.text}
                        </MessageResponse>
                      ) : null,
                    )}
                  </MessageContent>
                </Message>
              ))
            )}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Pensando com calma…</Shimmer>
                </MessageContent>
              </Message>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground"
              >
                {error.message || "Não foi possível responder agora. Tente novamente."}
              </p>
            )}
          </ConversationContent>
          <ConversationScrollButton aria-label="Ir para a mensagem mais recente" />
        </Conversation>

        <div className="border-t bg-background py-4">
          <PromptInput
            onSubmit={({ text }) => {
              if (!text.trim() || status !== "ready") return;
              void sendMessage({ text: text.trim() });
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              autoFocus
              placeholder="Conte o que você precisa organizar…"
              aria-label="Mensagem para a assistente"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status}
                onStop={stop}
                disabled={status === "submitted"}
                aria-label={status === "streaming" ? "Parar resposta" : "Enviar mensagem"}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            A conversa não fica salva ao sair desta página.
          </p>
        </div>
      </div>
    </main>
  );
}
