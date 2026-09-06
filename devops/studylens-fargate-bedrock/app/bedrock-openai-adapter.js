// Bedrock <- OpenAI adapter.
//
// StudyLens only speaks the OpenAI Chat Completions wire format
// (POST {baseUrl}/chat/completions, Bearer auth). Amazon Bedrock uses a
// different API (Converse) with SigV4/IAM auth. This tiny server bridges the
// two: it listens on localhost inside the container, accepts OpenAI-shaped
// chat-completion requests, and forwards them to Bedrock's Converse API using
// the App Runner instance role (no API key anywhere).
//
// StudyLens is pointed at  http://localhost:8787/v1  as an "openai-compatible"
// provider with an empty apiKey; this process does the real call to
// modelId = BEDROCK_MODEL_ID (an inference profile, e.g. us.openai.gpt-5.6-luna).
const http = require('http');
const {
  BedrockRuntimeClient,
  ConverseCommand,
} = require('@aws-sdk/client-bedrock-runtime');

const PORT = parseInt(process.env.ADAPTER_PORT || '8787', 10);
const REGION = process.env.BEDROCK_REGION || 'us-east-1';
// Must be an inference profile id for on-demand GPT-5.6 Luna.
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.openai.gpt-5.6-luna';

const client = new BedrockRuntimeClient({ region: REGION });

// Convert OpenAI chat messages -> Bedrock Converse (messages[] + optional
// system[]). Bedrock pulls the system prompt into a separate `system` field.
function toBedrock(openaiMessages) {
  const system = [];
  const messages = [];
  for (const m of openaiMessages || []) {
    const text = typeof m.content === 'string'
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('')
        : String(m.content ?? '');
    if (m.role === 'system') {
      system.push({ text });
    } else if (m.role === 'assistant') {
      messages.push({ role: 'assistant', content: [{ text }] });
    } else {
      // user + any unknown role fold into a user turn
      messages.push({ role: 'user', content: [{ text }] });
    }
  }
  return { system, messages };
}

// Bedrock rejects consecutive same-role turns; merge them defensively, and
// require the first message to be a user turn.
function coalesce(messages) {
  const out = [];
  for (const msg of messages) {
    const last = out[out.length - 1];
    if (last && last.role === msg.role) {
      last.content.push(...msg.content);
    } else {
      out.push({ role: msg.role, content: [...msg.content] });
    }
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 25 * 1024 * 1024) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  // Accept both /v1/chat/completions and /chat/completions.
  if (req.method === 'POST' && /\/chat\/completions$/.test(req.url)) {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');
      const { system, messages } = toBedrock(payload.messages);
      const coalesced = coalesce(messages);

      const inferenceConfig = {};
      if (payload.max_tokens != null) inferenceConfig.maxTokens = payload.max_tokens;
      if (payload.temperature != null) inferenceConfig.temperature = payload.temperature;
      if (payload.top_p != null) inferenceConfig.topP = payload.top_p;
      if (inferenceConfig.maxTokens == null) inferenceConfig.maxTokens = 4096;

      const cmd = new ConverseCommand({
        modelId: MODEL_ID,
        messages: coalesced,
        ...(system.length ? { system } : {}),
        inferenceConfig,
      });
      const out = await client.send(cmd);
      const text = (out.output?.message?.content || [])
        .map((c) => c.text || '')
        .join('');

      // Shape the reply as an OpenAI chat.completion so StudyLens's parser
      // (data.choices[0].message.content) works unchanged.
      const body = JSON.stringify({
        id: 'chatcmpl-bedrock',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: MODEL_ID,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: text },
          finish_reason: out.stopReason === 'max_tokens' ? 'length' : 'stop',
        }],
        usage: {
          prompt_tokens: out.usage?.inputTokens ?? 0,
          completion_tokens: out.usage?.outputTokens ?? 0,
          total_tokens: out.usage?.totalTokens ?? 0,
        },
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(body);
    } catch (err) {
      console.error('bedrock-openai-adapter request failed:', err);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'Upstream request failed' } }));
    }
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'not found' } }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Bedrock adapter on http://127.0.0.1:${PORT} -> ${MODEL_ID} (${REGION})`);
});
