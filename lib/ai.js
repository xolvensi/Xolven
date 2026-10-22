const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-5-5';

const SYSTEM_PROMPT = `You are an assistant that reads WhatsApp conversation transcripts between a business and one of its clients, and extracts a structured profile.

Rules you must follow exactly:
- Only report what is literally said in the conversation. Never invent, assume, or infer information that is not explicitly stated.
- The conversation may mix Spanish and English, use informal language, abbreviations, and typos. Understand it, but write your output in English.
- If there is nothing to report for a category (e.g. no pending items), say so plainly, e.g. "Nothing open right now." Do not leave it blank and do not make something up.
- Keep each fact to one short sentence.
- The summary must be 2-4 sentences describing who this client is and the state of the relationship, based only on the conversation.

Respond with ONLY a JSON object, no markdown fences, no extra text, in this exact shape:
{
  "summary": "string, 2-4 sentences",
  "facts": [
    { "label": "SOLD", "text": "string" },
    { "label": "AGREED", "text": "string" },
    { "label": "PENDING", "text": "string" },
    { "label": "DEADLINE", "text": "string" }
  ]
}`;

async function generateClientProfile(clientData) {
  const transcript = clientData.history
    .map((m) => m.time + ' - ' + m.from + ': ' + m.text)
    .join('\n');

  const userPrompt = `Client name: ${clientData.name}\n\nConversation transcript:\n${transcript}\n\nExtract the structured profile following the rules.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response was not valid JSON: ' + text.slice(0, 200));
    parsed = JSON.parse(match[0]);
  }

  return parsed;
}

module.exports = { generateClientProfile };
