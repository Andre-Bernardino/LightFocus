import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

type ChatMessage = { role: "system" | "user"; content: string };

export function createLovableResponsesProvider(apiKey: string, initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let resolved = false;
  const ready = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publish = (value?: string) => {
    if (!runId && value?.trim()) runId = value.trim();
    if (!resolved) {
      resolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publish(runId);

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
      try {
        const response = await fetch(input, { ...init, headers });
        publish(response.headers.get(RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publish();
        throw error;
      }
    },
  });

  return {
    model: provider.responses("openai/gpt-6-astra"),
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : ready),
  };
}

export function getLovableRunId(request: Request) {
  return request.headers.get(RUN_ID_HEADER)?.trim() || undefined;
}

export async function withLovableRunId(response: Response, gateway: ReturnType<typeof createLovableResponsesProvider>) {
  if (!response.body) return response;
  const reader = response.body.getReader();
  const firstChunk = reader.read();
  const runId = await gateway.waitForRunId();
  const headers = new Headers(response.headers);
  if (runId) {
    headers.set(RUN_ID_HEADER, runId);
    headers.set("Access-Control-Expose-Headers", RUN_ID_HEADER);
  }

  const body = new ReadableStream({
    async start(controller) {
      try {
        const first = await firstChunk;
        if (!first.done) controller.enqueue(first.value);
        while (!first.done) {
          const chunk = await reader.read();
          if (chunk.done) break;
          controller.enqueue(chunk.value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export async function callAiGateway(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  try {
    const gateway = createLovableResponsesProvider(apiKey);
    const result = streamText({
      model: gateway.model,
      messages,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    return (await result.text) || null;
  } catch {
    return null;
  }
}
