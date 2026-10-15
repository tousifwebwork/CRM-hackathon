const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODEL = import.meta.env.VITE_CHAT_MODEL || "claude-haiku-5-5";

const SYSTEM_PROMPT =
  "You are a friendly assistant inside a small CRM app. Help users with leads, services, sales follow-ups and how to use the app. Keep answers short and clear.";

// messages: [{ role: "user" | "assistant", content: "text" }]
export async function sendChat(messages) {
  if (!API_KEY) {
    throw new Error("Missing VITE_ANTHROPIC_API_KEY. Add it to your .env file and restart the dev server.");
  }

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        // Required when calling the API directly from a browser
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-20), // keep only the recent history
      }),
    });
  } catch {
    throw new Error("Cannot reach the chat service. Check your internet connection.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Chat request failed (${res.status}).`);
  }

  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return text || "(No response)";
}