import { apiFetch } from "./client";

export type AssistantMsg = { role: "user" | "assistant" | "system"; content: string };

// Сопоставление локального (фронтового) id ассистента с серверным.
const MAP_KEY = "neeklo.assistants.map";

function loadMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveMap(m: Record<string, string>) {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/**
 * Возвращает серверный id ассистента для данного локального id.
 * Если ещё нет — создаёт реального ассистента на бэке (create-on-first-use).
 */
export async function ensureAssistant(localId: string, name = "Ассистент"): Promise<string> {
  const map = loadMap();
  if (map[localId]) return map[localId];
  const created = await apiFetch<{ id: string }>("/assistants", {
    method: "POST",
    body: { name },
  });
  map[localId] = created.id;
  saveMap(map);
  return created.id;
}

export async function listAssistants() {
  return apiFetch<{ id: string; name: string; createdAt: string }[]>("/assistants");
}

export async function chatAssistant(
  serverId: string,
  messages: AssistantMsg[],
): Promise<{ messageId: string; text: string }> {
  return apiFetch(`/assistants/${serverId}/chat`, {
    method: "POST",
    body: { messages },
  });
}
