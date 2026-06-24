/**
 * Minimal OpenAI chat client (raw fetch, JSON mode). Cheap model, hard token cap. No SDK dep.
 * If OPENAI_API_KEY is absent, callers fall back to deterministic mock mode (never crash).
 */
export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10);
}

export const AGENT_MODEL = process.env.AGENT_MODEL ?? "gpt-4o-mini";

export async function chatJSON<T>(
  system: string,
  user: string,
  maxTokens = 220,
): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no OPENAI_API_KEY");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: AGENT_MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = (await r.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
