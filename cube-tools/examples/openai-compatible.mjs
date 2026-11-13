#!/usr/bin/env node
/**
 * Minimal OpenAI-compatible chat loop with local Cube tools.
 *
 * Works with OpenAI, DeepSeek, and other providers that implement
 * /chat/completions with tool_calls.
 *
 * Required:
 *   OPENAI_API_KEY
 *   OPENAI_MODEL
 *
 * Optional:
 *   OPENAI_BASE_URL   default: https://api.openai.com/v1
 *   TOOLS_URL         default: http://127.0.0.1:4100
 *
 * Examples:
 *   OPENAI_BASE_URL=https://api.deepseek.com OPENAI_MODEL=deepseek-chat \
 *     node examples/openai-compatible.mjs "Which airlines have the most routes?"
 */
const TOOLS_URL = (process.env.TOOLS_URL || 'http://127.0.0.1:4100').replace(/\/$/, '');
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
const MODEL = process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'deepseek-chat';
const QUESTION =
  process.argv.slice(2).join(' ') ||
  'Using the Cube semantic layer, show earthquakes per magnitude band.';

if (!API_KEY) {
  console.error('Set OPENAI_API_KEY (or LLM_API_KEY) first.');
  process.exit(1);
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const tools = await jsonFetch(`${TOOLS_URL}/tools`);

const messages = [
  {
    role: 'system',
    content: [
      'You are a governed analytics assistant.',
      'Use only the Cube semantic layer tools.',
      'Always call get_semantic_model before writing a query.',
      'Never invent cube, measure, dimension, or segment names.',
      'Use run_cube_query to fetch data.',
      'Pass order as an object mapping member names to asc or desc.',
      'When presenting results, mention the Cube query you used.'
    ].join(' ')
  },
  { role: 'user', content: QUESTION }
];

for (let turn = 0; turn < 6; turn += 1) {
  const completion = await jsonFetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0
    })
  });

  const message = completion?.choices?.[0]?.message;
  if (!message) throw new Error('The model returned no message.');

  messages.push(message);

  if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
    for (const call of message.tool_calls) {
      const name = call.function?.name;
      let args = {};

      try {
        args = JSON.parse(call.function?.arguments || '{}');
      } catch {
        args = {};
      }

      console.error(`\n→ ${name} ${JSON.stringify(args)}`);

      const result = await jsonFetch(`${TOOLS_URL}/tools/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
    continue;
  }

  console.log(message.content ?? JSON.stringify(message));
  process.exit(0);
}

console.error('Stopped after 6 turns without a final answer.');
process.exit(1);
