const CHAT_API_URL =
  import.meta.env.VITE_CHAT_API_URL ?? "http://localhost:8080/api/chat";

export interface ChatRequest {
  conversationId: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
  conversationId?: string;
}

export async function sendChatMessage(
  request: ChatRequest,
  signal: AbortSignal,
): Promise<ChatResponse> {
  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  const responseText = await response.text();
  let payload: unknown;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        return { reply: responseText };
      }
      payload = responseText;
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : typeof payload === "string" && payload
          ? payload
          : response.statusText;
    throw new Error(
      `The chat service returned ${response.status}${detail ? `: ${detail}` : "."}`,
    );
  }

  if (typeof payload === "string") {
    return { reply: payload };
  }

  if (typeof payload !== "object" || payload === null) {
    throw new Error("The chat service returned an empty or invalid response.");
  }

  const data = payload as Record<string, unknown>;
  const reply =
    data.reply ?? data.answer ?? data.response ?? data.message ?? data.content;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error(
      "The chat service response did not include a reply. Expected a string in reply, answer, response, message, or content.",
    );
  }

  return {
    reply,
    conversationId:
      typeof data.conversationId === "string" ? data.conversationId : undefined,
  };
}
