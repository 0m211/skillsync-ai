const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

export const isGroqConfigured = Boolean(apiKey);

if (!isGroqConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[SkillSync] VITE_GROQ_API_KEY is missing. Add it to your .env file to enable real AI analysis. Falling back to demo data until then.'
  );
}

/**
 * Sends a prompt to Groq (OpenAI-compatible endpoint) and expects a JSON object back.
 * Throws if Groq isn't configured, the call fails, or the response isn't valid JSON,
 * so callers can decide how to fall back.
 */
export async function generateJSON<T>(prompt: string): Promise<T> {
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? '';

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Groq returned invalid JSON: ${(err as Error).message}`);
  }
}
