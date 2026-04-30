// Vercel Serverless Function: CORS-safe LLM API proxy
// 浏览器 BYOK 模式无法直接调 DeepSeek/Kimi/Qwen 等大多数 LLM API（被 CORS 拦截），
// 此函数透传请求到允许列表内的 LLM 服务，绕开浏览器同源限制。
// 不存储、不打印 API key。请求/响应一次性透传后销毁。

const ALLOWED_HOSTS = new Set([
  'api.deepseek.com',
  'api.moonshot.cn',
  'api.moonshot.ai',
  'dashscope.aliyuncs.com',
  'dashscope-intl.aliyuncs.com',
  'open.bigmodel.cn',
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'openrouter.ai',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let payload;
  try {
    payload = req.body && typeof req.body === 'object'
      ? req.body
      : JSON.parse(req.body || '{}');
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { url, headers = {}, body = '' } = payload;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url' });
    return;
  }

  let parsed;
  try { parsed = new URL(url); }
  catch { res.status(400).json({ error: 'Invalid url' }); return; }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    res.status(400).json({ error: 'Host not allowed: ' + parsed.hostname });
    return;
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'Upstream fetch failed: ' + e.message });
  }
}
