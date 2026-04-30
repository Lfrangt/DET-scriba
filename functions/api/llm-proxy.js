// EdgeOne Pages Edge Function: CORS-safe LLM API proxy
// 与 api/llm-proxy.js (Vercel) 行为完全一致，只是语法是 EdgeOne 边缘函数风格。
// 国内用户从 *.edgeone.app 访问时由这个函数处理 LLM 请求转发。
//
// 不存储、不打印 API key，请求一次性透传后销毁。

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

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  // 🎁 Demo 模式：用 EdgeOne env DEEPSEEK_DEMO_KEY 调 DeepSeek
  if (payload.demo === true) {
    const demoKey = env.DEEPSEEK_DEMO_KEY;
    if (!demoKey) {
      return jsonResponse(503, { error: 'Demo 模式未配置（DEEPSEEK_DEMO_KEY 缺失）' });
    }
    try {
      const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + demoKey,
        },
        body: typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body),
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
      });
    } catch (e) {
      return jsonResponse(502, { error: 'Demo upstream failed: ' + e.message });
    }
  }

  // BYOK 模式：透传到用户指定的 LLM API
  const { url, headers = {}, body = '' } = payload;
  if (!url || typeof url !== 'string') {
    return jsonResponse(400, { error: 'Missing url' });
  }

  let parsed;
  try { parsed = new URL(url); }
  catch { return jsonResponse(400, { error: 'Invalid url' }); }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return jsonResponse(400, { error: 'Host not allowed: ' + parsed.hostname });
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
    });
  } catch (e) {
    return jsonResponse(502, { error: 'Upstream fetch failed: ' + e.message });
  }
}

// EdgeOne 也会把 GET/其他方法路由到这里，明确拒绝
export async function onRequest({ request }) {
  if (request.method === 'POST') return onRequestPost(arguments[0]);
  return jsonResponse(405, { error: 'Method not allowed' });
}
