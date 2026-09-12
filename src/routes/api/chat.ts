import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  createLovableResponsesProvider,
  getLovableRunId,
  withLovableRunId,
} from "@/lib/ai-gateway.server";

type ChatBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        if (!Array.isArray(body.messages)) {
          return Response.json({ message: "Envie uma mensagem para continuar." }, { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json(
            { message: "A conversa com IA ainda não está configurada." },
            { status: 500 },
          );
        }

        const messages = body.messages as UIMessage[];
        const gateway = createLovableResponsesProvider(apiKey, getLovableRunId(request));
        const result = streamText({
          model: gateway.model,
          system:
            "Você é a assistente de foco do LightFocus para pessoas com TDAH. Responda sempre em português do Brasil, com acolhimento, clareza e frases curtas. Ajude a reduzir sobrecarga, iniciar tarefas e dividir objetivos em passos pequenos. Faça no máximo uma pergunta por vez. Não diagnostique, não substitua profissionais de saúde e, diante de risco imediato, incentive a busca por ajuda local de emergência.",
          messages: await convertToModelMessages(messages),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onFinish: () => {},
          onError: (error) =>
            error instanceof Error ? error.message : "Não foi possível obter uma resposta agora.",
        });
        return withLovableRunId(response, gateway);
      },
    },
  },
});
