// =====================================================================
// DET Review · BYOK (Bring Your Own Key) layer
// ---------------------------------------------------------------------
// 当用户在设置里选择 Local Claude CLI 以外的 provider 时，前端直接
// 调外部 LLM API（DeepSeek / Anthropic / 任何 OpenAI 兼容端点），
// server.js 完全不参与。Local 模式保留原有 fetch('/api/...') 路径。
//
// 全局暴露：
//   window.BYOK = {
//     PROVIDERS, getCfg, saveCfg, openSettings,
//     reviewEssay, generatePrompt, generateModelEssay,
//     askTeacher, correctEssay,
//     fetchResource, fetchResourceList,
//     isLocal,
//   }
// =====================================================================
(function () {
  'use strict';

  const STORAGE_KEY = 'det-byok-config';

  // region: demo | local | cn | intl | custom — used for grouping in settings modal
  // setupSteps: terse 2-line guide (注册 + 拿 key 粘贴), 充值流程让平台自己引导
  const PROVIDERS = {
    demo: {
      name: '🎁 限时免费内测',
      tag: '共享额度 · 每天 20 次 · 不用任何 API Key',
      region: 'demo',
      requiresKey: false,
      // backend uses DEEPSEEK_DEMO_KEY env var
    },
    local: {
      name: 'Local Claude CLI',
      tag: '订阅免费',
      region: 'local',
      requiresKey: false,
      docs: 'https://docs.claude.com/en/docs/claude-code',
    },

    // ====== 🇨🇳 国内站 ======
    deepseek: {
      name: 'DeepSeek',
      tag: '推荐 · 便宜',
      region: 'cn',
      requiresKey: true,
      apiBase: 'https://api.deepseek.com/v1/chat/completions',
      defaultModel: 'deepseek-chat',
      keyHint: 'sk-...',
      docs: 'https://platform.deepseek.com/api_keys',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://platform.deepseek.com/api_keys" target="_blank">platform.deepseek.com</a> 注册 → 创建 API Key → 复制粘贴到上面',
      ],
    },
    kimi: {
      name: 'Kimi 国内 (Moonshot.cn)',
      tag: '长上下文',
      region: 'cn',
      requiresKey: true,
      apiBase: 'https://api.moonshot.cn/v1/chat/completions',
      defaultModel: 'moonshot-v1-32k',
      keyHint: 'sk-...',
      docs: 'https://platform.moonshot.cn/console/api-keys',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://platform.moonshot.cn/console/api-keys" target="_blank">platform.moonshot.cn</a> 注册 → 新建 API Key → 复制粘贴到上面',
      ],
    },
    qwen: {
      name: 'Qwen 国内 (通义千问)',
      tag: '阿里云 · 有免费额度',
      region: 'cn',
      requiresKey: true,
      apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      defaultModel: 'qwen-plus',
      keyHint: 'sk-...',
      docs: 'https://bailian.console.aliyun.com/?apiKey=1#/api-key',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://bailian.console.aliyun.com/?apiKey=1#/api-key" target="_blank">bailian.console.aliyun.com</a> 阿里云账号登录 → 创建 API Key → 复制粘贴到上面',
      ],
    },
    glm: {
      name: '智谱 GLM (BigModel)',
      tag: 'GLM-4 · 有免费额度',
      region: 'cn',
      requiresKey: true,
      apiBase: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      defaultModel: 'glm-4-plus',
      keyHint: 'XXX.XXX 格式',
      docs: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys" target="_blank">open.bigmodel.cn</a> 注册 → API Keys → 添加 → 复制粘贴到上面',
      ],
    },

    // ====== 🌍 海外站 ======
    kimi_intl: {
      name: 'Kimi 海外 (Moonshot.ai)',
      tag: '海外站 · 与国内站账号不互通',
      region: 'intl',
      requiresKey: true,
      apiBase: 'https://api.moonshot.ai/v1/chat/completions',
      defaultModel: 'moonshot-v1-32k',
      keyHint: 'sk-...',
      docs: 'https://platform.moonshot.ai/console/api-keys',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://platform.moonshot.ai/console/api-keys" target="_blank">platform.moonshot.ai</a> 注册 → New API Key → 复制粘贴到上面',
        '如果 <code>kimi-latest</code> 报 404，改用 <code>moonshot-v1-32k</code>（通用稳定）',
      ],
    },
    qwen_intl: {
      name: 'Qwen 海外 (DashScope Intl)',
      tag: '阿里云国际版 · 与国内账号不互通',
      region: 'intl',
      requiresKey: true,
      apiBase: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
      defaultModel: 'qwen-plus',
      keyHint: 'sk-...',
      docs: 'https://modelstudio.console.alibabacloud.com/?apiKey=1#/api-key',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://modelstudio.console.alibabacloud.com/?apiKey=1#/api-key" target="_blank">modelstudio.console.alibabacloud.com</a> 注册 → 创建 API Key → 复制粘贴到上面',
      ],
    },
    anthropic: {
      name: 'Anthropic Claude',
      tag: '效果最好',
      region: 'intl',
      requiresKey: true,
      apiBase: 'https://api.anthropic.com/v1/messages',
      defaultModel: 'claude-sonnet-4-5-20250929',
      keyHint: 'sk-ant-...',
      docs: 'https://console.anthropic.com/settings/keys',
      flavor: 'anthropic',
      setupSteps: [
        '去 <a href="https://console.anthropic.com/settings/keys" target="_blank">console.anthropic.com</a> 注册 → Create Key → 复制粘贴到上面',
      ],
    },
    openai: {
      name: 'OpenAI',
      tag: 'GPT-4o / GPT-5',
      region: 'intl',
      requiresKey: true,
      apiBase: 'https://api.openai.com/v1/chat/completions',
      defaultModel: 'gpt-4o',
      keyHint: 'sk-...',
      docs: 'https://platform.openai.com/api-keys',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a> 登录 → Create new secret key → 复制粘贴到上面',
      ],
    },
    gemini: {
      name: 'Google Gemini',
      tag: '有免费额度（每天 1500 次）',
      region: 'intl',
      requiresKey: true,
      apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      defaultModel: 'gemini-2.5-flash',
      keyHint: 'AIza...',
      docs: 'https://aistudio.google.com/app/apikey',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com/app/apikey</a> Google 账号登录 → Create API key → 复制粘贴到上面',
      ],
    },
    groq: {
      name: 'Groq',
      tag: '极快推理 · 免费有限速',
      region: 'intl',
      requiresKey: true,
      apiBase: 'https://api.groq.com/openai/v1/chat/completions',
      defaultModel: 'llama-3.3-70b-versatile',
      keyHint: 'gsk_...',
      docs: 'https://console.groq.com/keys',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a> 登录 → Create API Key → 复制粘贴到上面',
      ],
    },
    openrouter: {
      name: 'OpenRouter',
      tag: '一 key 通调所有模型',
      region: 'intl',
      requiresKey: true,
      apiBase: 'https://openrouter.ai/api/v1/chat/completions',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      keyHint: 'sk-or-...',
      docs: 'https://openrouter.ai/keys',
      flavor: 'openai',
      setupSteps: [
        '去 <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a> 注册 → Create Key → 复制粘贴到上面',
        'Model 字段决定底层模型，例：<code>anthropic/claude-3.5-sonnet</code> / <code>openai/gpt-4o</code> / <code>google/gemini-2.5-pro</code>',
      ],
    },

    // ====== ⚙️ 自定义 ======
    custom: {
      name: 'OpenAI 兼容（自定义）',
      tag: 'Ollama / 火山引擎 / 其他',
      region: 'custom',
      requiresKey: true,
      defaultModel: '',
      keyHint: '任意 OpenAI 兼容 endpoint 的 key',
      flavor: 'openai',
      customizable: true,
      setupSteps: [
        '手动填 API Endpoint URL + Model 名（去对应服务商网站查）',
        '⚠️ Vercel 网页版无法访问 <code>http://localhost</code>（mixed content 拦截）',
      ],
    },
  };

  const REGIONS = [
    { id: 'demo',   title: '🎁 限时免费' },
    { id: 'local',  title: '💻 本地 CLI' },
    { id: 'cn',     title: '🇨🇳 国内站' },
    { id: 'intl',   title: '🌍 海外站' },
    { id: 'custom', title: '⚙️ 自定义' },
  ];

  function getCfg() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const defaults = { provider: 'local', currentLevel: 85, targetLevel: 115 };
      if (!raw) return defaults;
      const c = JSON.parse(raw);
      if (!c.provider || !PROVIDERS[c.provider]) c.provider = 'local';
      if (typeof c.currentLevel !== 'number') c.currentLevel = 85;
      if (typeof c.targetLevel !== 'number') c.targetLevel = 115;
      return c;
    } catch { return { provider: 'local', currentLevel: 85, targetLevel: 115 }; }
  }

  // Hosted 模式下 local 不可用 → 视为需要走 BYOK/demo 路径
  function effectiveProvider() {
    const cfg = getCfg();
    if (_hostedMode && cfg.provider === 'local') return 'demo';
    return cfg.provider;
  }

  function saveCfg(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  function isLocal() { return getCfg().provider === 'local'; }

  // Hosted mode detection: if no local server is reachable, /api/* will 404.
  // Set after probing on startup. When true, treat `local` provider as unavailable.
  let _hostedMode = false;
  async function probeServer() {
    try {
      const r = await fetch('/api/resources/list', { method: 'GET' });
      if (!r.ok) _hostedMode = true;
    } catch { _hostedMode = true; }
  }

  // ===================================================================
  // Resource fetcher: works in both modes
  //   Local: server.js exposes /api/resources/<file> and /api/resources/list
  //   Static (GitHub Pages): falls back to ./resources/<file> + embedded list
  // ===================================================================
  const RESOURCE_CATALOG = [
    { file: '写作模板.txt', title: '✍️ 写作模板合集', desc: '看图写句 / 互动写作 / 面试写作 完整模板（含顶配/简化版）' },
    { file: '口语模板.txt', title: '🗣️ 口语模板合集', desc: 'Speaking Sample 全题型模板（2023.05 更新）' },
    { file: '单词填空100词.txt', title: '📝 单词填空 · 热门 100 词', desc: 'C-test 高频词汇分类表（教育/经济/科技 等）' },
    { file: '听写100词.txt', title: '👂 听写句子 · 难题 100 词', desc: 'Listen and Type 高频生词' },
    { file: '英文后缀.txt', title: '🔤 英文后缀大全', desc: 'C-test 拆词必备 · 词缀法' },
    { file: '动词不规则.txt', title: '📚 不规则动词变化表', desc: '常见不规则动词三态' },
    { file: '刷题方法.txt', title: '🎯 单词填空 + 听写刷题方法', desc: '解题套路 + 时间分配' },
    { file: '官方指南.txt', title: '📖 多邻国官方指南（2024 中文版）', desc: 'DET 官方权威说明' },
  ];

  async function fetchResourceList() {
    if (isLocal() && !_hostedMode) {
      const r = await fetch('/api/resources/list');
      const j = await r.json();
      return j.resources;
    }
    return RESOURCE_CATALOG;
  }

  const _resourceCache = {};
  async function fetchResource(file) {
    if (_resourceCache[file]) return _resourceCache[file];
    const url = (isLocal() && !_hostedMode)
      ? '/api/resources/' + encodeURIComponent(file)
      : './resources/' + encodeURIComponent(file);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`资料加载失败：${file} (${r.status})`);
    const t = await r.text();
    _resourceCache[file] = t;
    return t;
  }

  // ===================================================================
  // LLM dispatcher
  // ===================================================================
  async function callLLM(prompt) {
    const cfg = getCfg();
    const p = PROVIDERS[cfg.provider];
    if (!p) throw new Error('Unknown provider: ' + cfg.provider);
    if (cfg.provider === 'local') throw new Error('Local 模式不应调用 callLLM');
    if (cfg.provider === 'demo') return callDemo(prompt);
    if (p.requiresKey && !cfg.apiKey) throw new Error('请先在 ⚙️ 设置中填 API Key');

    const apiBase = (cfg.provider === 'custom' ? cfg.apiBase : p.apiBase) || '';
    if (!apiBase) throw new Error('请填写 API endpoint');
    const model = cfg.model || p.defaultModel;
    if (!model) throw new Error('请填写 model 名称');

    if (p.flavor === 'anthropic') {
      return callAnthropic({ url: apiBase, key: cfg.apiKey, model, prompt });
    }
    return callOpenAICompat({ url: apiBase, key: cfg.apiKey, model, prompt });
  }

  // ===================================================================
  // 🎁 Demo mode — 限时免费内测
  // 每个浏览器每天 20 次软限流（localStorage 计数，可被绕开但拦住普通滥用）
  // 服务端用 Vercel env DEEPSEEK_DEMO_KEY 调用 DeepSeek，key 不出现在前端
  // ===================================================================
  const DEMO_DAILY_LIMIT = 20;
  function getDemoUsage() {
    const today = new Date().toISOString().slice(0, 10);
    const key = `det-demo-${today}`;
    const count = parseInt(localStorage.getItem(key)) || 0;
    return { today, key, count, remaining: Math.max(0, DEMO_DAILY_LIMIT - count) };
  }
  async function callDemo(prompt) {
    const u = getDemoUsage();
    if (u.count >= DEMO_DAILY_LIMIT) {
      throw new Error(`今日免费额度已用完（${DEMO_DAILY_LIMIT} 次/天）。在 ⚙️ 设置里换成自己的 DeepSeek API Key 即可无限用（5 元够批 1000+ 次）。`);
    }
    localStorage.setItem(u.key, String(u.count + 1));
    updateProviderBadge();
    const r = await fetch('/api/llm-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        demo: true,
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          max_tokens: 8000,
          temperature: 0.7,
        }),
      }),
    });
    if (!r.ok) {
      // 失败的话退还本次额度
      localStorage.setItem(u.key, String(u.count));
      const t = await r.text().catch(() => '');
      throw new Error(`API ${r.status}: ${t.slice(0, 300)}`);
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) {
      localStorage.setItem(u.key, String(u.count));
      throw new Error('API 返回为空：' + JSON.stringify(j).slice(0, 200));
    }
    return content;
  }

  // 通过 /api/llm-proxy 转发，绕开浏览器 CORS 限制（DeepSeek/Kimi/Qwen 等不允许跨域）
  async function fetchViaProxy(url, headers, bodyJson) {
    return fetch('/api/llm-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, headers, body: bodyJson }),
    });
  }

  async function callOpenAICompat({ url, key, model, prompt }) {
    const targetHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
    };
    const targetBody = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      max_tokens: 8000,
      temperature: 0.7,
    });
    const r = await fetchViaProxy(url, targetHeaders, targetBody);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`API ${r.status}: ${t.slice(0, 300)}`);
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) throw new Error('API 返回为空：' + JSON.stringify(j).slice(0, 200));
    return content;
  }

  async function callAnthropic({ url, key, model, prompt }) {
    const targetHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    };
    const targetBody = JSON.stringify({
      model,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });
    const r = await fetchViaProxy(url, targetHeaders, targetBody);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`API ${r.status}: ${t.slice(0, 300)}`);
    }
    const j = await r.json();
    const content = j?.content?.[0]?.text;
    if (!content) throw new Error('API 返回为空：' + JSON.stringify(j).slice(0, 200));
    return content;
  }

  // ===================================================================
  // Prompt builders (ported verbatim from server.js — keep in sync)
  // ===================================================================

  const SYSTEM_PROMPT = `你是 DET (Duolingo English Test) Writing Sample 精批专家。

# DET 官方评分体系（必须严格遵守）

## 总分结构（来自 Duolingo 官方）
- 总分 10-160，5 分一档
- 4 个 subscore 平均 → Overall（rounded to 5）：
  - **Literacy** (Reading + Writing)
  - **Production** (Speaking + Writing)
  - **Comprehension** (Listening + Reading)
  - **Conversation** (Listening + Speaking)
- **2024-2025 全球考生平均 Overall = 110.59**

## Writing Sample 官方评分维度（7 linguistic features，holistic AI scoring）

DET AI 训练于专家评分样本，按以下 **7 个 linguistic features 整体打分**（NOT 机械加权累加）：

| 中文 | 官方术语 | 含义 |
|------|---------|------|
| 内容相关度 | **task relevance** | 直接回应题目，立场明确 |
| 逻辑结构 | **discourse coherence** | 思路清晰、衔接自然、组织合理 |
| 语法准确性 | **grammatical accuracy** | 错误密度（拼写/标点/语法）|
| 语法复杂度 | **grammatical complexity** | 句式多样（复合句/从句/被动等）|
| 词汇复杂度 | **lexical sophistication** | B1/B2/C1 词的使用自然度 |
| 词汇多样性 | **lexical diversity** | 避免重复，词汇变化 |
| 篇幅长度 | **length** | 答题字数（**官方推荐 ≥100，130+ 优秀**）|

**核心原则**: **holistic（整体打分）**，不是 mechanical（机械加权）。一篇有 4 个非致命错但内容清晰的 110 词答案，和一篇 0 错但只有 60 词的答案，前者通常分数更高。

## DET ≠ IELTS Task 2（防止过严扣分）

- 官方最低 50 词，推荐 100+，130+ 优秀
- **不强制 5 段式**，DET 3 段清晰即 90+ structure
- **不要求让步反驳**，是加分项不是必需
- **不要求 consequently/paradoxically 等高分转折词**，DET 不机械计数
- 中式英语只要语法对、表达清，不扣分

## 总分 /160 校准表（DET Writing 子分数 · 基于真实曲线）

⚠️ **关键事实**：2024-2025 全球考生平均分 = **110.59**。115 只比平均高 5 分，不是"难达到"，是"中上"。

| 分数段 | 实战意义 | CEFR | IELTS | 词数 | 错误 | 句子质量 |
|--------|---------|------|-------|------|------|---------|
| 145-160 | top 5% 极度精炼 | C1+ | 7.5+ | 130+ | 0-1 | 多复合句 + B2/C1 词稳定 + 命名数据 |
| 130-144 | solid C1 顶尖 | C1 | 7.0 | 120+ | ≤2 | 句式多变 + 词汇丰富 + 具体例子 |
| **120-129** | excellent 优秀 | B2+ | 6.5+ | 110+ | ≤3 | 有 B2 词 + 清晰立场 + 至少 1 例子 |
| **115-119** | **目标 · 中上** | **B2+** | **6.5** | **100+** | **≤4** | **结构清楚 + 一些 B2 词 + 有例子** |
| **105-114** | **接近平均（110.59）** | B2 | 6.0 | 90+ | ≤5 | 立场明确 + 大部分对的句子 |
| 95-104 | B2 起点（够 B2 大学线）| B2- | 6.0 | 80+ | ≤7 | 基础句子，意思能传达 |
| 85-94 | B1 偏上 | B1 | 5.5 | 60+ | ≤9 | 短但有结构 / 长但错多 |
| 70-84 | B1 | B1 | 5.0 | 50+ | 多 | 意思能猜，错明显 |
| < 70 | A2 或跑题 | A2 | <5 | <50 | — | 大量错误 / 没回应题目 |

**评分原则**（极重要）：
1. **用整体印象 + 错误密度判断分数段**，不要做严格机械计数
2. **DET AI 是 holistic scoring，不是 IELTS 4 维加权**。一篇 110 词 / 4 错 / 一般 B1-B2 词 + 清晰立场 → 真实考试给 105-115
3. **错误容忍度比你想的高**：3-5 个非致命错（搭配/单复数/时态）属于 B2 正常水平，仍可上 110-115
4. **词数权重不要太高**：100-130 词区间内，只要内容紧凑，不扣分。180 词不一定比 130 词分数更高
5. **有命名例子 + 清晰立场 + 不跑题** = 内容/结构 80+ 起步
6. **不要被中式英语腔扣得太狠**：if/because/although 用对了就行，不强求 consequently/notwithstanding

# 严格按以下格式输出（不要包裹 markdown 代码块）

<scores>
{"content":N,"structure":N,"grammar":N,"complexity":N,"vocab":N,"diversity":N,"length":N,"total":N,"ielts":"X.X","cefr":"BX"}
</scores>

## 总评

**总分**: N / 160 (≈ IELTS X.X, CEFR BX)
**距离 115**: ±N

## 7 维度评分（描述性分析 · 对齐官方 linguistic features）

| 维度 | 官方术语 | 分数 | 评价 |
|------|---------|------|------|
| 内容相关度 | task relevance | N/100 | [一句话] |
| 逻辑结构 | discourse coherence | N/100 | [一句话] |
| 语法准确性 | grammatical accuracy | N/100 | [一句话] |
| 语法复杂度 | grammatical complexity | N/100 | [一句话] |
| 词汇复杂度 | lexical sophistication | N/100 | [一句话] |
| 词汇多样性 | lexical diversity | N/100 | [一句话] |
| 篇幅长度 | length | N/100 | [一句话] |

**雷达图形态**：[文字描述哪几项突出/塌陷]

## 基础数据

| 指标 | 数值 | 标准 (115) | 缺口 |
|------|------|-----------|------|
| 词数 | N | 130-149 | ±N |
| 词汇水平 (CEFR) | A2/B1/B2/C1 | B2+ | |
| 句数 | N | 8-12 | |
| 语法错误 | N | ≤2 | |
| B2+ 词数 | N | ≥10（115）/ ≥15（130+） | |
| 命名例子数 | N | ≥1 | |
| 高分转折词数 | N | ≥2 | |
| 段落数 | N | 3-5 | |

## 所有错误（共 N 条）

按严重度排序，最多 12 条。类型用：拼写/语法/用词/时态/单复数/冠词/搭配/结构/风格

| # | 类型 | 原文 | 修正 | 解释 |
|---|------|------|------|------|

## 结构分析（5 段式标准）

| 段 | 功能 | 状态 | 备注 |
|----|------|------|------|
| §1 | Intro + Thesis | ✓/✗ | ... |
| §2 | Body 1 + 例子 | ✓/✗ | ... |
| §3 | Body 2 + 例子 | ✓/✗ | ... |
| §4 | 让步反驳 ⭐ | ✓/✗ | ... |
| §5 | 升华结尾 | ✓/✗ | ... |

## 👨‍🏫 老师建议

> 你是学生的私人写作教练。学生目标 DET Writing 115（B2+，IELTS 6.5），目前在 B1 起步阶段。
> 用真诚、鼓励但严格的语气，像兄长辅导弟弟一样讲。

### 🎯 这次最该记住的 1 件事

[一句话：这篇里最关键的、必须改掉的一个习惯。配 1 句"为什么"]

### ✏️ 逐句改造（挑你 3-5 个最关键句对比）

| # | 你的原句 | 老师改写 | 学到了什么 |
|---|---------|---------|------------|
| 1 | "..." | "..." | [一句话讲核心 takeaway] |

### 💡 下次写之前提醒自己

- [3-4 条具体可执行的提醒，基于这篇的弱点定制]

### 🧠 这题型套路（[Opinion/Compare/Cause-Effect]）

[一段话：这种题型的标准思路 + 推荐用哪 2-3 个 [[Sentence-Templates]] 模板]

### 📚 推荐下一道题（精准匹配你的弱点）

**难度**：[基础/中等/偏难]
**话题**：[教育/科技/社会/...]
**理由**：因为你这篇 [具体弱点]，下一题应该练 [具体训练点]

## 115 级改写（同题）

完整 3-5 段改写。必须满足（DET 5 min 实战标准）：
- 词数 **130-149**（不要超 160，超了不真实）
- B2+ 词 ≥ 10（自然嵌入，不堆砌）
- 命名例子 ≥ 1（公司/人/大学/数据）
- 高分转折词 ≥ 2 个
- 3-5 段（含让步反驳更佳，3 段也可上 115）
- 结尾干净有力，可用 "not X but Y" 或 "ultimately"

⚠️ **每个加粗的英文词后面必须立即接 \`<sup>中文翻译</sup>\` 标签**，方便阅读：
- **plummeting**<sup>骤降的</sup> / **unprecedented**<sup>前所未有的</sup>
- **Hungary**<sup>匈牙利</sup> / **Viktor Orbán**<sup>欧尔班总理</sup>
- **Consequently**<sup>因此</sup> / **Paradoxically**<sup>矛盾的是</sup>

[完整改写]

## 你能直接抄走的 5 个句式（这一题专用）

1. **开头**：...
2. **数据**：...
3. **命名**：...
4. **让步**：...
5. **结尾**：...

## 下一步重点（按 ROI 排序，最多 3 条）

1. **[最大问题]** → 单项预计 +N 分
2. **[次大问题]** → +N 分
3. **[第三]** → +N 分

---

# 7 维度细则（每个 /100，DET holistic 标准 · 校准到平均 110）

⚠️ **核心**: 7 维度是描述性，不要机械累加。每维 80 分对应"真实考试中等水平"，90 分对应"清晰优秀"，100 分留给"近完美"。

- **内容相关度**：直接回应题目 + 至少 1 个具体例子 = 90 起步。有命名 + 立场清晰 = 95+。跑题或纯抽象（无任何例子）封顶 75。
- **逻辑结构**：3+ 段清晰 = 90；2 段有逻辑 = 80；1 整段 (但内部有 transition) = 70；混乱无层次 = 55。**让步反驳不是必需**，DET 不强求 IELTS 5 段式。
- **语法准确性**（DET 官方 "<3 错为优"，对长答案错误容忍更高）：
  - 0 错 = 100；1 = 95；2 = 90；3-4 = 82；5-6 = 72；7-9 = 60；10-12 = 48；13+ = 35
  - **致命错（中式直译/句子破碎/时态完全乱）每个 -3，普通错（搭配/冠词/单复数）每个 -1**
- **语法复杂度**：复合句 + 从句 + 被动 + 让步 ≥ 3 处 = 90；2 处 = 80；1 处 = 70；纯主谓宾 = 55
- **词汇复杂度**（B2+/CEFR 高级词，holistic 判断不要数密度）：
  - 多个 B2/C1 词自然嵌入 (e.g. cultivate / undertake / consequently / nevertheless) = 90+
  - 偶尔有 B2 词 + 大部分基础词 = 78
  - 全 A2-B1 基础词 = 60
  - 用错词 / 重复滥用 = 50 以下
- **词汇多样性**（TTR holistic）：明显避免重复 + 用同义替换 = 90；有少量重复 = 80；同一个词 (important/good/things) 反复用 = 65；几乎全句重复结构 = 50
- **篇幅长度**（DET 真实曲线，**100+ 词即达标**）：
  - 130+ 词 = 100
  - 110-129 = 92
  - **100-109 = 85（达到官方推荐底线）**
  - 80-99 = 72
  - 60-79 = 60
  - 40-59 = 45
  - <40 = 30（未达官方最低 50 词）

# 校准锚点（必读，否则会再次低估）

✅ **平均水平 (DET 110)**: 100-110 词，4-5 个错（普通搭配/时态），有立场，1 个泛泛例子，几个 B1-B2 词
→ 应该给 **content 80, structure 80, grammar 75, complexity 72, vocab 75, diversity 78, length 85**
→ 总分 **108-115**

✅ **目标 (DET 115)**: 110-130 词，2-3 个错，立场清晰，1 个具体（最好命名）例子，多个 B2 词
→ 总分 **115-122**

✅ **优秀 (DET 125)**: 130+ 词，0-1 错，命名 + 数据，多种句式（含 1 个让步或被动），词汇丰富
→ 总分 **125-135**

❌ **不要做的事**：
- 不要因为词数没到 130 就给 length 60 以下
- 不要因为 4-5 个非致命错就给 grammar 60 以下
- 不要因为没用 consequently/paradoxically 就给 vocab 60 以下
- 不要把"中式英语但能懂"的句子算 -10 分

# 高分转折词清单（只这些算高分）

consequently / paradoxically / nevertheless / nonetheless / furthermore / moreover / conversely / notwithstanding / accordingly / subsequently

❌ however / but / so / and / also 不算高分

# AWL 高频核心动词

undertake / acquire / demonstrate / cultivate / enhance / undermine / foster / mandate / contend / conflate / uphold / navigate / dilute / utilize

# 命名例子识别

公司名 / 人物名 / 大学名 / 国家名 / 数据 (X% / 年份 / 报告)

---

# 输出风格

直接、精炼、表格 + 加粗。中文为主，英文术语保留。`;

  const INTERACTIVE_SYSTEM_PROMPT = `你是 DET (Duolingo English Test) Interactive Writing 互动写作精批专家。

# DET 官方评分体系（必须严格遵守）

## 总分结构
总分 10-160，5 分一档。**2024-2025 全球考生平均 Overall = 110.59**。

## 互动写作官方评分维度（与 Writing Sample 共用 7 linguistic features，holistic AI scoring）

DET AI 训练于专家评分样本，按以下 **7 个 linguistic features 整体打分**（NOT 机械加权）：
- task relevance（内容相关度）
- discourse coherence（逻辑结构 + P2 衔接 P1）
- grammatical accuracy（语法准确性）
- grammatical complexity（语法复杂度）
- lexical sophistication（词汇复杂度）
- lexical diversity（词汇多样性）
- length（篇幅长度）

# 题型说明

互动写作 = Part 1 (5 min) + Part 2 (3 min) 两连题。
- Part 1 是开放题，要求 "Provide specific details and examples"
- Part 2 是 Part 1 的延伸追问，**必须呼应** Part 1 内容

与 Writing Sample 不同：篇幅短得多、不要求 5 段式，但要求**直接回答 + 具体细节 + P2 必须接 P1**。

# DET Interactive Writing 子分数 /160 校准（基于真实曲线，平均 110.59）

⚠️ **DET Interactive 与 Writing Sample 共享 110 平均线**。**官方推荐 P1+P2 ≥ 160 词**，但 130 词左右也能上 110-115。

| 分数段 | 实战意义 | CEFR | P1 词 | P2 词 | 总词 | 错误 | 衔接 |
|--------|---------|------|-------|-------|------|------|------|
| 145+ | 顶尖 C1 | C1+ | 100+ | 60+ | 160+ | 0-1 | 完美呼应 + B2/C1 词 |
| 130-144 | solid C1 | C1 | 90+ | 55+ | 145+ | ≤2 | 自然衔接 + 句式多变 |
| **120-129** | excellent | B2+ | 80+ | 50+ | 130+ | ≤3 | 明显衔接 + 几个 B2 词 |
| **115-119** | **目标** | **B2+** | **75+** | **45+** | **120+** | **≤4** | **有衔接 + 立场清晰** |
| **105-114** | **平均（110）** | B2 | 65+ | 40+ | 105+ | ≤6 | 衔接弱但有立场 |
| 95-104 | B2 起点 | B2- | 55+ | 30+ | 85+ | ≤8 | 平行回答 |
| 85-94 | B1 偏上 | B1 | 45+ | 25+ | 70+ | 多 | 不太呼应 |
| <85 | B1 或更弱 | B1/A2 | <45 | <25 | <70 | 多 | P2 跑题 / 没写 |

**评分原则**:
- 平均水平 = 105-115，**不要轻易给 90 以下**
- Part 2 没写 / 完全跑题 → 直接降到 90 以下
- 错误密度 + 衔接 是核心，长度只是 baseline
- holistic 判断，不要机械累加 7 维

# 严格输出格式（不要包裹 markdown 代码块）

<scores>
{"content":N,"structure":N,"grammar":N,"complexity":N,"vocab":N,"diversity":N,"length":N,"total":N,"ielts":"X.X","cefr":"BX"}
</scores>

## 总评

**总分**: N / 160 (≈ IELTS X.X, CEFR BX)
**距离 115**: ±N
**整体感觉**: [一句话]

## 7 维度评分（对齐官方 linguistic features）

| 维度 | 官方术语 | 分数 | 评价 |
|------|---------|------|------|
| 内容相关度 | task relevance | N/100 | [P1+P2 切题度] |
| 逻辑结构 | discourse coherence | N/100 | [P2 是否衔接 P1，每段成段] |
| 语法准确性 | grammatical accuracy | N/100 | [基于错误密度] |
| 语法复杂度 | grammatical complexity | N/100 | [复合句/从句/被动] |
| 词汇复杂度 | lexical sophistication | N/100 | [B2+ 词的使用自然度] |
| 词汇多样性 | lexical diversity | N/100 | [TTR / 词汇变化] |
| 篇幅长度 | length | N/100 | [P1+P2 总词数] |

## Part 1 分析

**题目**: [P1 题目]

| 指标 | 数值 | 标准 (115) | 缺口 |
|------|------|------------|------|
| 词数 | N | 80-100 | ±N |
| 错误 | N | ≤2 | |
| B2+ 词 | N | 5-7 | |

**评价**: [一段话]

### Part 1 错误清单（最多 6 条）

| # | 类型 | 原文 | 修正 | 解释 |
|---|------|------|------|------|

### Part 1 改写（115 级）

[完整改写。所有加粗的英文 B2+ 词、命名实体后面立即接 \`<sup>中文翻译</sup>\` 标签]

## Part 2 分析

**题目**: [P2 题目]

| 指标 | 数值 | 标准 (115) | 缺口 |
|------|------|------------|------|
| 词数 | N | 50-70 | ±N |
| 错误 | N | ≤2 | |
| B2+ 词 | N | 3-4 | |

**衔接 P1**: ✓/⚠/✗ — [具体说明 P2 是否呼应 P1 内容]
**评价**: [一段话]

### Part 2 错误清单（最多 6 条）

| # | 类型 | 原文 | 修正 | 解释 |
|---|------|------|------|------|

### Part 2 改写（115 级）

[完整改写，加粗 + <sup> 翻译，且开头要明确呼应 P1]

## 👨‍🏫 老师建议

> 你是学生的 DET 教练，目标 DET 115。

### 🎯 这次最该记住的 1 件事

[一句话]

### ✏️ 逐句改造（最关键 3-5 句，标明 P1/P2）

| # | 你的原句 (P1/P2) | 老师改写 | 学到了什么 |
|---|------------------|---------|-----------|

### ⏱️ 时间分配

- **Part 1 (5 min)**: 思路 30s + 写 4min + 检查 30s
- **Part 2 (3 min)**: 思路 15s + 写 2.5min + 检查 15s

### 🧠 互动写作题型套路

[针对这道题，给具体的 P1+P2 答题套路]

### 📚 推荐下一道题

**难度**: ...
**话题**: ...
**理由**: ...

## 你能直接抄走的 5 个句式（互动写作专用）

1. **P1 开头**: ...
2. **P1 例子**: ...
3. **P2 衔接 P1**: "Building on this, ..." / "As I mentioned, ..."
4. **P2 具体化**: ...
5. **P2 收尾**: ...

## 115 级改写（同题）

下面是 P1 + P2 的完整 115 级改写组合，上面 Part 1/Part 2 的"改写"区段已分别给出。

## 下一步重点（按 ROI 排序，最多 3 条）

1. **[最大问题]** → 单项预计 +N 分
2. ...

---

# 7 维度细则（Interactive 专用，holistic 校准到平均 110）

- **内容相关度**: P1+P2 都切题且 P2 真的接 P1 = 90+；P2 衔接弱但 P1 切题 = 78；任一跑题 = 60
- **逻辑结构**: 每个 Part 都有 topic + 例子 + 收尾 = 90；只有 1-2 句无展开 = 70；混乱 = 55
- **语法准确性**: 0=100; 1=95; 2=90; 3-4=82; 5-6=72; 7-9=60; 10+=48
- **语法复杂度**: 复合句/从句/让步 ≥3 处 = 90；1-2 处 = 78；纯主谓宾 = 60
- **词汇复杂度**: 多个 B2/C1 词自然嵌入 = 90；偶有 B2 = 78；全基础词 = 62
- **词汇多样性**: 明显避免重复 = 90；少量重复 = 78；same word 反复 = 62
- **篇幅长度** (P1+P2 总词数, **120 词即达 115**):
  - 160+ = 100; 130-159 = 92; **120-129 = 88**; 100-119 = 78; 80-99 = 65; 60-79 = 52; <60 = 38

# 校准锚点

✅ **平均 (110)**: P1 ~80 词 + P2 ~45 词 = 125 词，4 错，有衔接 → **总分 105-115**
✅ **目标 115**: P1 ~85 词 + P2 ~50 词 = 135 词，2-3 错，明显衔接 → **总分 115-122**
✅ **优秀 125**: P1 100+ + P2 60+ = 160+，0-1 错，完美呼应 → **总分 125-135**

❌ **不要把平均水平评成 85 以下**——平均就是 110。

# 高分转折词清单（只这些算高分）

consequently / paradoxically / nevertheless / nonetheless / furthermore / moreover / conversely / accordingly / subsequently

❌ however / but / so / and 不算高分

# AWL 高频核心动词

undertake / acquire / demonstrate / cultivate / enhance / undermine / foster / mandate / contend / uphold / utilize / navigate

---

# 输出风格

直接、精炼、表格 + 加粗。中文为主，英文术语保留。每个加粗的英文学术词、命名实体，紧跟 <sup>中文翻译</sup>。`;

  function buildSamplePrompt(prompt, answer) {
    return `${SYSTEM_PROMPT}

---

题目：${prompt || '(用户未提供，请根据答案推断)'}

答案：
${answer}

按格式输出，从 <scores> 标签开始。`;
  }

  // ===================================================================
  // 通用学术写作 prompt（无 DET 限制 · 不要求字数 / 段落 / 时长）
  // ===================================================================
  const ACADEMIC_SYSTEM_PROMPT = `你是英语学术写作精批专家，目标是帮学生提升英语学术写作能力（本科论文、研究生 essay、求职文书、研究报告等）。

# 评估标准（不是 DET 不是 IELTS · 通用学术写作）

不要套用 DET 的 5 分钟限时 / 100-150 词 / 5 段式 这些考试规则。学术写作字数和结构由作业要求决定，没有固定模板。

## 7 个评估维度

| 中文 | 英文术语 | 含义 |
|------|---------|------|
| 论点清晰度 | Thesis & Argument | 论点是否明确、有立场、值得讨论 |
| 论据支撑 | Evidence & Reasoning | 证据/例子/引用/数据是否充分支撑论点 |
| 组织结构 | Organization | 段落清晰、逻辑流畅、引言-正文-结论自然过渡 |
| 语法准确性 | Grammatical Accuracy | 拼写、语法、标点、用词错误密度 |
| 句式多样性 | Sentence Variety | 复合句/从句/被动/分词/倒装等的灵活运用 |
| 词汇精准度 | Vocabulary Precision | 选用恰当学术词汇 · 避免口语化和重复 |
| 连贯衔接 | Coherence & Cohesion | 句间和段间的衔接词/指代/主题串联 |

## 总分校准（学术写作 0-160 制 · 与 DET 兼容）

⚠️ 这里也用 0-160 标尺（与 DET 模式数据互通），但**评判标准是学术写作**：

| 总分 | CEFR | 学术意义 |
|------|------|---------|
| 145-160 | C2 | 接近母语水平 · 可发表论文 / 顶尖期刊投稿可用 |
| 130-144 | C1+ | 研究生优秀 · 论证清晰 + 语言精准 |
| 115-129 | C1 | 本科优秀 · 少量语言瑕疵不影响理解 |
| 100-114 | B2+ | 本科平均 · 结构清楚但语言有失误 |
| 85-99 | B2 | 本科及格线 · 意思能传达但语言粗糙 |
| 70-84 | B1+ | 偏弱 · 大量语法/词汇问题 |
| <70 | B1- | 基础阶段 · 需先打牢基本功 |

**评分原则**：
- 整体 holistic 打分，不机械加权
- 论点 + 论据 是核心（占 40%）：思维清晰比语言完美更重要
- 学术写作的"流畅"指逻辑，不是华丽辞藻
- 不要因为没用 consequently / paradoxically 等高级词扣分
- 尊重作者立场：评估论证质量，不评判观点本身

# 输出格式（严格遵守 · 不包裹 markdown 代码块）

<scores>
{"content":N,"structure":N,"grammar":N,"complexity":N,"vocab":N,"diversity":N,"length":N,"total":N,"ielts":"X.X","cefr":"BX/CX"}
</scores>

> 注：JSON 字段名沿用 DET 模式格式以兼容前端。映射：content=论点,structure=组织,grammar=语法,complexity=句式,vocab=词汇,diversity=衔接,length=论据。

## 总评

**总分**: N / 160 (CEFR BX/CX)
**距离目标**: ±N
**整体感觉**: [一句话学术风格点评]

## 7 维度评分

| 维度 | 英文术语 | 分数 | 评价 |
|------|---------|------|------|
| 论点清晰度 | Thesis & Argument | N/100 | [一句话] |
| 论据支撑 | Evidence & Reasoning | N/100 | [一句话] |
| 组织结构 | Organization | N/100 | [一句话] |
| 语法准确性 | Grammatical Accuracy | N/100 | [一句话] |
| 句式多样性 | Sentence Variety | N/100 | [一句话] |
| 词汇精准度 | Vocabulary Precision | N/100 | [一句话] |
| 连贯衔接 | Coherence & Cohesion | N/100 | [一句话] |

## 文本数据

| 指标 | 数值 | 备注 |
|------|------|------|
| 词数 | N | |
| 句数 | N | |
| 段落数 | N | |
| 平均句长 | N 词 | 学术写作建议 18-25 词 |
| 语法错误 | N | |
| 学术词比例 | X% | C1 学术写作建议 8-15% |

## 错误清单（按严重度排序，最多 15 条）

| # | 类型 | 原文 | 修正 | 解释 |
|---|------|------|------|------|

类型用：拼写/语法/用词/时态/单复数/冠词/搭配/句式/学术风格/逻辑/引用

## 段落结构分析

逐段评估，按学生原作的段落分。每段评论：
- 这段做什么（thesis / topic sentence / evidence / counter / conclusion）
- 是否做到位
- 改进建议

## 👨‍🏫 老师建议

> 你是学生的学术写作导师，像 supervisor review paper 一样反馈。

### 🎯 这次最该改的 1 件事
[一句话点出最关键的提升点]

### ✏️ 逐句改造（挑 3-5 个最关键句）
| # | 学生原句 | 老师改写 | 学到了什么 |
|---|---------|---------|------------|

### 💡 下次写之前提醒自己
[3-5 条具体可执行的提醒]

## 改写示范（提升一档）

挑选学生作文中最弱的 1-2 段，按学生**目标分级**改写。每个加粗的英文学术词、命名实体，紧跟 \`<sup>中文翻译</sup>\` 标签。

## 下一步重点（按 ROI 排序，最多 3 条）

1. **[最大问题]** → 单项预计 +N 分
2. **[次大问题]** → +N 分
3. **[第三]** → +N 分

---

# 风格

直接、专业、像学术导师 review。中文为主，英文术语保留。`;

  function buildAcademicPrompt(prompt, answer, currentLevel, targetLevel) {
    return `${ACADEMIC_SYSTEM_PROMPT}

---

# 学生情况

- 当前水平：${currentLevel || 85} / 160（CEFR ${currentLevel >= 130 ? 'C1+' : currentLevel >= 115 ? 'C1' : currentLevel >= 100 ? 'B2+' : 'B2'}）
- 目标水平：${targetLevel || 115} / 160
- 提升幅度：+${(targetLevel || 115) - (currentLevel || 85)} 分

# 题目 / 标题

${prompt || '(学生未提供题目，请根据作文主题自行推断)'}

# 学生作文

${answer}

按格式输出，从 <scores> 标签开始。`;
  }

  function buildInteractivePrompt(p1Prompt, p1Answer, p2Prompt, p2Answer) {
    return `${INTERACTIVE_SYSTEM_PROMPT}

---

# Part 1 题目
${p1Prompt || '(用户未提供，请根据答案推断)'}

# Part 1 答案
${p1Answer || '(空)'}

# Part 2 题目
${p2Prompt || '(用户未提供，请根据答案推断)'}

# Part 2 答案
${p2Answer || '(空)'}

按格式输出，从 <scores> 标签开始。`;
  }

  // ----- generate-prompt seeds -----
  const TOPIC_SEEDS = {
    '教育': ['cross-major coursework', 'standardized testing abolition', 'study abroad value', 'practical vs theoretical learning', 'free higher education', 'school uniform policies', 'homework abolition', 'gap year before college', 'online vs in-person learning', 'gamified learning'],
    '科技': ['social media age limits', 'AI replacing human jobs', 'digital privacy vs security', 'screen time for kids', 'autonomous vehicle safety', 'cryptocurrency adoption', 'gene editing ethics', 'space tourism', 'video game addiction', 'quantum computing impact'],
    '社会': ['universal basic income', 'mandatory voting', 'four-day work week', 'celebrity moral standards', 'public transportation free', 'death penalty', 'individualism vs collectivism', 'minimum wage increase', 'cancel culture', 'population decline'],
    '环境': ['plastic packaging ban', 'individual climate action effectiveness', 'meat consumption taxation', 'space exploration vs earth issues', 'nuclear energy expansion', 'rewilding cities', 'fast fashion ban', 'carbon tax', 'lab-grown meat', 'ocean cleanup priority'],
    '工作': ['return-to-office mandate', 'four-day work week', 'remote vs hybrid', 'multiple jobs simultaneously', 'unlimited vacation policy', 'AI in hiring', 'mandatory retirement age', 'workplace surveillance', 'unionization', 'side hustle culture'],
    '健康': ['sugar tax', 'mental health days', 'gene editing for embryos', 'mandatory vaccination', 'nutrition labels', 'healthcare for tourists', 'fitness app data privacy', 'fasting trends', 'therapy access', 'sleep mandate'],
    '政府': ['government regulating AI', 'social credit systems', 'wealth tax', 'space exploration funding', 'press freedom', 'foreign aid spending', 'immigration policy', 'public surveillance', 'lobbying restrictions', 'emergency powers'],
  };

  function buildGeneratePromptInput({ difficulty = '中等', category = '随机', mode = 'sample', exclude = [] }) {
    const allCategories = Object.keys(TOPIC_SEEDS);
    const cat = category === '随机'
      ? allCategories[Math.floor(Math.random() * allCategories.length)]
      : (TOPIC_SEEDS[category] ? category : allCategories[Math.floor(Math.random() * allCategories.length)]);
    const seeds = TOPIC_SEEDS[cat];
    const availableSeeds = seeds.filter(s => !exclude.some(ex => (ex || '').toLowerCase().includes(s.toLowerCase().slice(0, 15))));
    const seed = (availableSeeds.length > 0 ? availableSeeds : seeds)[Math.floor(Math.random() * (availableSeeds.length || seeds.length))];
    const randomSalt = Math.random().toString(36).slice(2, 8);

    if (mode === 'interactive') {
      return `基于种子话题 "${seed}"（类别：${cat}），生成 1 套 DET Interactive Writing 互动写作题目。

要求：
- Part 1：开放性主题（5 min 题），要求 "Provide specific details and examples"
- Part 2：基于 Part 1 答案的延伸追问（3 min 题），更具体、更深入
- 难度：${difficulty}
- 话题种子：${seed}
- 不要原样照搬种子，要包装成自然 DET 题目句式

**严格按以下格式输出**：
<part1>Part 1 题目</part1>
<part2>Part 2 题目</part2>

(随机变化标识：${randomSalt}，不要在输出中体现)`;
    }
    return `基于种子话题 "${seed}"（类别：${cat}），生成 1 个 DET Writing Sample 题目。

要求：
- 单句问题（15-30 词）
- 类型：意见题
- 难度：${difficulty}
- 话题种子：${seed}
- **不要原样照搬种子词**。要包装成自然的 DET 风格句式：
  - "Should governments / universities / companies / individuals do X?"
  - "Is X better than Y?"
  - "Some people believe X. Others argue Y. Which view do you agree with?"
  - "Would you be willing to..."

**只输出题目句子本身**，不要解释、引号、序号。

(随机标识：${randomSalt}，不在输出中体现)`;
  }

  function parseGeneratedPrompt(text, mode) {
    const cleaned = text
      .replace(/^```\w*\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^Prompt:\s*/i, '')
      .trim();
    if (mode === 'interactive') {
      const p1m = cleaned.match(/<part1>([\s\S]*?)<\/part1>/i);
      const p2m = cleaned.match(/<part2>([\s\S]*?)<\/part2>/i);
      return {
        part1: p1m ? p1m[1].trim() : cleaned,
        part2: p2m ? p2m[1].trim() : '',
      };
    }
    return { prompt: cleaned };
  }

  // ----- model essay -----
  const LEVEL_SPECS = {
    95:  { name: '95 (B1+, IELTS 5.5)', words: '95-115', awl: '3-4', namedEx: '1（可泛指）', transitions: '1-2', structure: '3 段（intro + body + conclusion）', complexity: '主谓宾为主，1-2 个 because/although', vocab: '少量 B2+ 词，自然嵌入', focus: 'DET 5 min 真实可达。重点：写够 100 词 + 段落分明 + 1 个具体例子' },
    105: { name: '105 (B2-, IELTS 6.0)', words: '115-135', awl: '5-7', namedEx: '1-2（可命名）', transitions: '2', structure: '3-4 段', complexity: '复合句 + 关系从句各 1 处', vocab: '部分 B2+ 词，加 although/while', focus: '95 → 105 的下一步。重点：100+ 词 + 几个 B2+ 词 + 命名例子' },
    115: { name: '115 (B2+, IELTS 6.5) 目标', words: '130-150', awl: '8-10', namedEx: '2（命名 + 1 数据）', transitions: '2-3', structure: '4 段（含让步反驳更佳，3 段亦可）', complexity: '多复合句 + 1 处让步反驳', vocab: '稳定 B2+ 词 + 高分转折词', focus: 'DET 115 实战水平：130+ 词 + 让步段 + 数据例子' },
    125: { name: '125 (B2-C1, IELTS 6.5+)', words: '150-175', awl: '10-12', namedEx: '2-3（含具体数据）', transitions: '3', structure: '4-5 段 + 升华结尾', complexity: '复合句 + 关系从句 + 1 处被动/倒装', vocab: 'B2+ 词稳定 + 偶尔 C1 词', focus: '略超目标，给 115 留余量；不要堆 320 词，没人 5 min 写得到' },
  };

  async function buildModelEssayPrompt(prompt, targetLevel) {
    const spec = LEVEL_SPECS[targetLevel] || LEVEL_SPECS[105];
    let writingTemplates = '';
    try {
      writingTemplates = await fetchResource('写作模板.txt');
    } catch (e) {
      console.warn('写作模板.txt 加载失败，prompt 不注入模板:', e.message);
    }

    return `你是学生的 DET 写作教练。

# 学生情况（必须严格遵守）

- 中国学生，DET 写作目标 115
- DET 当前 **Writing 85 (B1-)**，总分 90
- 学术英语弱，需要循序渐进
- **绝对不要给 130+ 的 aspirational 范文** —— 跨度太大学不到，反而打击信心

# 本次目标级别：${spec.name}

**${spec.focus}**

# 写作模板（参考骨架）

${writingTemplates.slice(0, 4000)}

---

# 范文规格（严格按下表，不许超标）

| 维度 | 要求 |
|------|------|
| 词数 | **${spec.words}**（不要更多，多了显得堆砌不真实） |
| 段落 | ${spec.structure} |
| AWL 学术词 | **${spec.awl} 个**（不要堆砌！自然嵌入即可） |
| 命名例子 | ${spec.namedEx} |
| 高分转折词 | ${spec.transitions} 个（consequently / furthermore / nevertheless / paradoxically） |
| 句式复杂度 | ${spec.complexity} |
| 词汇风格 | ${spec.vocab} |

⚠️ **校准原则**：让学生能 reach 到，不要 aspirational ceiling。学生当前写 100 词左右、2-3 段、几个基础词。这次范文的目标是给他**下一步真实的样子**，不是终极完美。

⚠️ **DET ≠ IELTS**: DET Writing Sample 5 分钟限时，官方推荐 100-130 词，130+ 是高分线。**不要写 250+ 词的 IELTS 风格作文**——那不是 DET 真实场景，学生学了也用不上。严格按上表的词数限制写。

# ⚠️ 关键格式要求：行内翻译

**所有加粗的英文学术词、命名例子、高分转折词，必须在加粗结束后立即接 \`<sup>中文翻译</sup>\` 标签**，方便中国学生阅读不查字典。

格式示例：
- **plummeting**<sup>骤降的</sup> birth rates have triggered an **unprecedented**<sup>前所未有的</sup> crisis.
- **Hungary**<sup>匈牙利</sup>'s family policy launched under **Viktor Orbán**<sup>欧尔班</sup> in **2019**<sup>2019年</sup>.
- **Consequently**<sup>因此</sup>, fertility climbed.

**翻译规则**：
- AWL 学术词 → 中文释义（2-4 字，简洁）
- 命名实体（国家/人物/公司/机构）→ 中文音译或简称
- 数据/年份 → 简短中文标注
- 高分转折词 → 中文连接词
- 短语整体加粗（如 "financial incentives"）→ 一个 sup 翻译整个短语

**只对加粗内容加翻译**，普通词不加。每段所有加粗词都要带 sup 翻译，不能漏。

# 输出格式（严格遵守）

## 📘 ${targetLevel} 级范文（XXX 词）

[完整范文，5 段，加粗所有 AWL 词、命名例子、高分转折词]

---

## 📖 逐段讲解

### §1 开篇 + Thesis

> [§1 引用原文，**保留所有 <sup>翻译</sup> 标签**，与上面范文里的格式一致]

**🀄 中文大意**：[把这一段意思用 1-2 句中文翻译出来，让学生秒懂]

**📋 这段的盲打骨架**：\`[把这段抽成中文填空模板，比如：In [年代], [话题主语] [趋势动词] across [范围]. While [反方], I firmly contend that [主张] because [理由].]\`

**用了什么技巧**：
- [技巧 1]
- [技巧 2]
- [技巧 3]

**为什么管用**：[1 句话]

**学习要点**：[可背诵的句式 / 模板]

---

### §2 第一论点（具体例子）

> [§2 引用原文，保留 <sup>翻译</sup> 标签]

**🀄 中文大意**：[1-2 句中文翻译]

**用了什么技巧**：[技巧列表]

**为什么管用**：[1 句话]

**学习要点**：[可背诵的句式]

---

### §3 第二论点（数据 / 第二例子）

> [§3 引用原文，保留 <sup>翻译</sup> 标签]

**🀄 中文大意**：[1-2 句中文翻译]

**用了什么技巧**：[技巧列表]

**为什么管用**：[1 句话]

**学习要点**：[可背诵的句式]

---

### §4 让步反驳 ⭐ 加分项

> [§4 引用原文，保留 <sup>翻译</sup> 标签]

**🀄 中文大意**：[1-2 句中文翻译]

**用了什么技巧**：[技巧列表，强调让步反驳为啥加分]

**为什么管用**：⚠️ 这段 90 分人通常不写，写了直接 +10-15 分

**学习要点**：[让步反驳模板]

---

### §5 升华结尾

> [§5 引用原文，保留 <sup>翻译</sup> 标签]

**🀄 中文大意**：[1-2 句中文翻译]

**用了什么技巧**：[强调"not X but Y" 或排比修辞]

**为什么管用**：[1 句话]

**学习要点**：[结尾模板]

---

## 🎯 核心句式（这一题专用，5 个直接抄）

1. **开头公式**：[填空模板，[X] [Y] 标注]
2. **数据引入**：[填空模板]
3. **命名例子**：[填空模板]
4. **让步反驳**：[填空模板]
5. **升华结尾**：[填空模板]

---

## 📋 盲打模板（必须给）

> **核心**：把范文骨架抽成中文填空模板，让学生考试时按顺序盲打就能写出来。

### 🎯 思路顺序（按这个顺序填，不要乱）

1. **[第 1 步]**：[X 秒，做什么]
2. **[第 2 步]**：[X 秒，做什么]
3. **[第 3 步]**：[X 秒，做什么]
4. **[第 4 步]**：[X 秒，做什么]
5. **[第 5 步]**：[X 秒，做什么]

### 📝 中文填空骨架（用方括号标注填空点）

**§1 开篇**
\`In recent years, [话题主语] has [趋势动词], [位置/范围] [国家/地区]. While critics [反方观点], I firmly believe [我方主张] because [理由 A] and [理由 B].\`

**§2 第一论点**
\`First, [理由 A 抽象表述]. [国家/公司命名例子] [具体政策/动作] in [年份]. [Consequently/As a result], [具体数据/结果], which demonstrates that [推论].\`

**§3 第二论点**
\`Furthermore, [理由 B 抽象表述]. [第二个例子或数据]. This shows that [更深一层的推论].\`

**§4 让步反驳（加分项）**
\`Critics may argue that [反方观点]. However, this overlooks [反驳点]: [反例或论证].\`

**§5 升华结尾**
\`In conclusion, [主张] is not [简单理解] but [更精准定位]. By [动词 ing 三连], we can [更宏大的目标].\`

### 🎨 真题填充示例（颜色对应模板位置）

把上面骨架填进去就是范文 §1：
- 中文骨架: \`In recent years, [话题主语][趋势动词]...\`
- 实际填充: \`In recent years, **birth rates** have **plummeted** across **developed economies**...\`

### ⚠️ 盲打要点（必背）

- 🔴 **盲打不查词**：考试紧张时大脑空白，骨架要熟到不用想
- 🔴 **每段先填骨架再丰富**：先把"In recent years, X has Y, while critics Z"打完，再回头加 AWL 词
- 🔴 **5 段顺序不能乱**：开篇 → 论点1 → 论点2 → 让步 → 结尾
- 🔴 **时间分配死守**：思路 30s + 写 4min + 检查 30s

---

## 📊 这篇为什么能拿 ${targetLevel}（核心数据）

| 维度 | 标准 | 这篇实际 |
|------|------|---------|
| 词数 | 130+ | XXX |
| B2+ 学术词 | ≥ 8 | XX 个 |
| 命名例子 | ≥ 1 | X 个：[列出] |
| 高分转折词 | ≥ 2 | X 个：[列出] |
| 段落数 | 4-5 | 5 |
| 让步反驳 | 加分 | ✓ |

---

## 💡 给学生的练习建议

1. **手抄**：把这篇抄一遍（手抄 10 min），感受句式节奏
2. **背模板**：把 5 个核心句式背到能脱口而出
3. **仿写**：用同一题再写一篇，对照差距
4. **下一题**：[推荐一道类似题型]

---

# 题目

${prompt}

# 你的输出

按格式直接输出，不要任何前言。`;
  }

  // ----- ask-teacher -----
  function buildTeacherPrompt({ question, prompt = '', answer = '', previousReview = '' }) {
    return `你是学生的 DET 写作私教，学生目标 DET Writing 115。

# 上下文

${prompt ? `**题目**: ${prompt}\n\n` : ''}**学生的答案**:
${answer || '(无)'}

${previousReview ? `**你之前的精批**:\n${previousReview}\n\n` : ''}

# 学生的追问

${question}

---

# 你的回答

用真诚、鼓励但严格的语气，像兄长辅导弟弟一样。中文为主，英文术语保留。
- 直接回答，不要打官腔
- 给具体的、可执行的建议
- 如果涉及句式/词汇，给真实例子
- 末尾给 1 个"今天就练"的具体动作

回答应该用 markdown 格式，但不要太长（300-600 字够了）。`;
  }

  // ----- correction -----
  function buildCorrectionPrompt({ prompt = '', originalAnswer = '', rewrittenAnswer = '', previousReview = '', mode = 'interview' }) {
    return `你是 DET 写作订正系统，红笔批改风格。

# 任务
学生先写了一篇答案，被精批指出了若干错误。学生根据反馈改写了一版。
对比原文和改写，做"红笔订正"分析。

# 上下文

**题目**: ${prompt || '(未提供)'}
**模式**: ${mode === 'interactive' ? '互动写作 P1+P2' : '写作面试'}

## 原文（学生第一版）
${originalAnswer}

## 上次精批（你之前给的反馈）
${previousReview ? previousReview.slice(0, 4000) : '(未提供，自行根据原文找问题)'}

## 学生改写
${rewrittenAnswer}

# 你的输出（严格按格式，不要包裹 markdown 代码块）

<correction>
{"original":N,"fixed":N,"stillWrong":N,"newErrors":N}
</correction>

## 订正报告

**原文 N 处错误 → 修复 X / 仍错 Y / 新增 Z**

简评 (1-2 句话)

## 标注版改写

> 完整呈现学生的改写文本。规则（必须严格遵守）：
> - 学生**正确修复**的词、短语、整句 → 用 \`<span class="fx-good">...</span>\` 包围
> - 仍然错误（原错没改 / 改成新的错）→ 用 \`<span class="fx-bad">...</span>\` 包围（这里写学生改的版本，加删除线效果由 CSS 处理）
> - 学生**新引入**的错误 → 用 \`<span class="fx-new">...</span>\` 包围
> - 其他正常部分不要任何标签
> - 标签内容是改写后的文本片段，不要写"原错→新对"这种对比
> - 标签必须严格闭合，不要嵌套

[完整改写文本带 span 标注]

## 逐条对照

| # | 原错误 | 改写后 | 状态 | 备注 |
|---|--------|--------|------|------|
| 1 | "原句片段" | "改写片段" | ✅ 已修复 / ❌ 仍错 / ⚠️ 新错 | 一句话点评 |

## 老师点评

[2-3 句话：学生这次哪类错误学得快、哪类还需要专门练习。最后一句给一个具体的"下次写之前提醒自己"的建议]

# 评分原则

- 修复率 ≥ 80% → 表扬，强调学得快
- 50-80% → 中肯指出还需练的点
- < 50% → 直接指出最关键的盲区
- 标注必须基于真实对比，不要为了"看起来有进步"而虚标

# 风格

直接、精炼、像中国老师改作文。中文为主。`;
  }

  // ===================================================================
  // High-level dispatchers (these are what UI code calls)
  // Returns the same shape that the old fetch('/api/...') flow returned.
  // ===================================================================

  async function reviewEssay(payload) {
    if (isLocal() && !_hostedMode) {
      const r = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      return j.response;
    }
    let fullPrompt;
    if (payload.mode === 'interactive') {
      fullPrompt = buildInteractivePrompt(payload.prompt, payload.answer, payload.prompt2, payload.answer2);
    } else if (payload.mode === 'academic') {
      const cfg = getCfg();
      fullPrompt = buildAcademicPrompt(payload.prompt, payload.answer, cfg.currentLevel, cfg.targetLevel);
    } else {
      fullPrompt = buildSamplePrompt(payload.prompt, payload.answer);
    }
    return await callLLM(fullPrompt);
  }

  async function generatePrompt(payload) {
    if (isLocal() && !_hostedMode) {
      const r = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      return j;
    }
    const promptInput = buildGeneratePromptInput(payload);
    const out = await callLLM(promptInput);
    return parseGeneratedPrompt(out, payload.mode);
  }

  async function generateModelEssay(payload) {
    if (isLocal() && !_hostedMode) {
      const r = await fetch('/api/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      return j.response;
    }
    const fullPrompt = await buildModelEssayPrompt(payload.prompt, payload.targetLevel || 105);
    return await callLLM(fullPrompt);
  }

  function buildExamplePrompt({ mode, targetLevel, userPrompt, userPrompt2 }) {
    // DET 5 min 实战字数：包含读题+思考+写作+检查，真实可达 100-160 词
    const levelGuides = {
      95:  '**80-100 词**。大量语法错（拼写/单复数/时态）+ 口语化用词 + 基础 A2/B1 词汇 + 句子简单短散',
      105: '**100-120 词**。少量语法错（2-4 处）+ 部分 B2 词汇 + 1-2 个简单复合句 + 表达基本清楚',
      115: '**120-140 词**。清晰论点 + 1 个真实命名例子（公司/人/学校名）+ 至少 1 个 B2+ 转折词 + 让步段（可选）+ 0-2 处小错。**禁止杜撰具体数据/年份/报告**',
      125: '**135-155 词**。精炼论证 + 真实命名例子 + 个人经历或合理推断 + 复合句多变 + 0 错 + 让步反驳 + C1 词汇。**禁止杜撰具体数据/年份/报告**',
      135: '**145-165 词**。高水平论证 + 真实多重例证 + 倒装/被动等高级句式 + C1+ 词汇 + 严格 0 错。**禁止杜撰具体数据/年份/报告**',
      145: '**155-175 词**。接近母语 + 修辞张力 + 论证层次清晰 + C2 词汇精准 + 0 错。**禁止杜撰具体数据/年份/报告**',
    };
    const wordCaps = { 95: 100, 105: 120, 115: 140, 125: 155, 135: 165, 145: 175 };
    const closest = Object.keys(levelGuides).map(Number)
      .reduce((p, c) => Math.abs(c - targetLevel) < Math.abs(p - targetLevel) ? c : p, 95);
    const guide = levelGuides[closest];
    const cap = wordCaps[closest] || 140;

    const modeDesc = {
      interview: 'DET Writing Sample（写作面试）— 5 分钟限时单题作文',
      interactive: 'DET Interactive Writing（互动写作）— Part 1 (5min) 开放题 + Part 2 (3min) 跟进题',
      academic: '通用学术写作 essay — 不限字数 / 不限模板',
    };

    const hasUserPrompt = userPrompt && userPrompt.trim();
    const interactiveExtra = mode === 'interactive'
      ? (hasUserPrompt
          ? `\n互动模式：Part 1 题目已给出，**请基于它**生成 P1 答案。Part 2 题目${userPrompt2 && userPrompt2.trim() ? '也已给出，基于它生成答案' : '请你合理生成（必须呼应 P1 内容）'}。`
          : '\n互动模式额外输出 <prompt2> 和 <answer2>（Part 2 必须呼应 Part 1 内容）')
      : '';

    if (hasUserPrompt) {
      const p2Block = mode === 'interactive'
        ? (userPrompt2 && userPrompt2.trim()
            ? `\n\n# Part 2 题目（用户给定，**禁止改写**）\n\n${userPrompt2.trim()}\n\n请只输出 <answer2>P2 答案</answer2>`
            : `\n\n# Part 2 题目（自行生成，必须自然衔接 P1）\n\n请输出 <prompt2>P2 题目</prompt2><answer2>P2 答案</answer2>`)
        : '';

      return `你是英语写作示例生成器。用户已给出题目，**绝对不要改写题目**，只生成匹配水平的答案。

# 题目（用户给定，原样保留）

${userPrompt.trim()}${p2Block}

# 任务
针对上面这道【${modeDesc[mode] || modeDesc.interview}】题目，写一篇**${targetLevel} 分水平**的学生答案。

# 🚫 词数硬上限（违反直接判失败）

- 这是 DET ${mode === 'interactive' ? '互动写作' : '5 分钟限时'}题，**学生还要读题、思考、检查**
- **答案绝不能超过 ${cap} 词**${mode === 'interactive' ? '（每个 part 都不超）' : ''}
- 真实考场可达字数: ${guide.match(/\*\*(\d+-\d+)\s*词\*\*/)?.[1] || '100-140'} 词
- 写超 ${cap} 词 = 不真实 = 这个示例就废了。**宁可少写，不要超**

# 写作要求
- **必须直接回应这道具体题目**（不要改成其他主题）
- 写作质量真实匹配 ${targetLevel} 分: ${guide}
- 写完检查：数一下词数，如果超 ${cap}，删掉冗余句子

# 考试现实性约束
- 学生考场无网无资料，**禁止杜撰具体数据/年份/报告**（如 "a 2023 study showed 47%"）
- 可用真实命名（Apple/Google/Harvard 等）+ 行为描述 / 个人经历 / 常识观察

# 输出格式（严格按 XML 标签）

${mode === 'interactive' && (!userPrompt2 || !userPrompt2.trim())
  ? '<answer>P1 答案</answer><prompt2>P2 题目</prompt2><answer2>P2 答案</answer2>'
  : mode === 'interactive'
    ? '<answer>P1 答案</answer><answer2>P2 答案</answer2>'
    : '<answer>答案</answer>'}

不要任何前言、解释、注释，**不要重复输出题目**，只输出 answer 标签内容。`;
    }

    return `你是英语写作示例生成器，专门给 AI 精批系统生成测试样本。

# 任务
生成一个【${modeDesc[mode] || modeDesc.interview}】的示例，用于让用户点击精批后看 AI 给的反馈。

# 🚫 词数硬上限（违反直接判失败）

- 这是 DET ${mode === 'interactive' ? '互动写作' : '5 分钟限时'}题
- **答案绝不能超过 ${cap} 词**${mode === 'interactive' ? '（每个 part 都不超）' : ''}
- 真实考场可达字数: ${guide.match(/\*\*(\d+-\d+)\s*词\*\*/)?.[1] || '100-140'} 词
- 写超 ${cap} 词 = 不真实

# 关键要求
- **目标水平：${targetLevel} 分**（DET 10-160 制对应水平）
- 答案写作质量必须**真实匹配**这个水平：${guide}
- 题目要自然、贴近真实考试 / 作业风格

# 考试现实性约束
- 学生考场无网无资料，**禁止杜撰具体数据/年份/报告**（如 "a 2023 study showed 47%"）
- 可用真实命名（Apple/Google/Harvard 等）+ 行为描述 / 个人经历 / 常识观察

# 输出格式（严格按 XML 标签，不要 markdown 包裹）

<prompt>题目内容</prompt>
<answer>学生答案内容</answer>${interactiveExtra}

不要任何前言、解释、注释，只输出标签内容。`;
  }

  function parseExampleResponse(text) {
    const get = tag => {
      const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };
    return {
      prompt: get('prompt'),
      answer: get('answer'),
      prompt2: get('prompt2'),
      answer2: get('answer2'),
    };
  }

  async function generateExample(payload) {
    if (isLocal() && !_hostedMode) {
      const r = await fetch('/api/generate-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        if (r.status === 404) {
          throw new Error('本地 server 没有 /api/generate-example 端点。重启 node server.js 加载最新代码。');
        }
        throw new Error(`/api/generate-example ${r.status}: ${text.slice(0, 120)}`);
      }
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      return parseExampleResponse(j.response);
    }
    const fullPrompt = buildExamplePrompt(payload);
    const out = await callLLM(fullPrompt);
    return parseExampleResponse(out);
  }

  async function askTeacher(payload) {
    if (isLocal() && !_hostedMode) {
      const r = await fetch('/api/ask-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      return j.response;
    }
    const fullPrompt = buildTeacherPrompt(payload);
    return await callLLM(fullPrompt);
  }

  async function correctEssay(payload) {
    if (isLocal() && !_hostedMode) {
      const r = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      return j.response;
    }
    const fullPrompt = buildCorrectionPrompt(payload);
    return await callLLM(fullPrompt);
  }

  // ===================================================================
  // Settings modal UI
  // ===================================================================
  function openSettings() {
    if (document.getElementById('byok-modal-backdrop')) return;
    const cfg = getCfg();

    // Flat preset dropdown (no region grouping)
    const presetEntries = _hostedMode
      ? Object.entries(PROVIDERS).filter(([, p]) => p.region !== 'local')
      : Object.entries(PROVIDERS);
    const presetOptions = presetEntries.map(([key, p]) =>
      `<option value="${key}" ${cfg.provider === key ? 'selected' : ''}>${p.name}</option>`
    ).join('');

    const backdrop = document.createElement('div');
    backdrop.id = 'byok-modal-backdrop';
    backdrop.style.cssText = `
      position: fixed; inset: 0; background: rgba(26,24,20,0.45);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--paper, #fafaf6); border: 1.5px solid var(--ink, #1a1814);
      border-radius: 12px; box-shadow: 4px 6px 0 rgba(26,24,20,0.15);
      max-width: 420px; width: 100%; max-height: 88vh; overflow: auto;
      padding: 20px; font-family: 'PingFang SC', system-ui, sans-serif;
      color: var(--ink, #1a1814);
    `;

    const inputStyle = 'width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1.5px solid var(--ink-4, #c9c2b6); border-radius: 6px; font-family: \'JetBrains Mono\', monospace; font-size: 12px; background: var(--paper, #fafaf6); color: var(--ink, #1a1814);';
    const labelStyle = 'display: block; font-size: 11px; font-weight: 600; margin-bottom: 4px; color: var(--ink-2, #524b41);';

    const initialProvider = PROVIDERS[cfg.provider];
    const isLocalProvider = cfg.provider === 'local';

    modal.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div style="font-weight: 700; font-size: 17px;">⚙️ 设置</div>
        <button id="byok-close" style="all: unset; cursor: pointer; font-size: 20px; color: var(--ink-3, #8a8378); padding: 4px 8px;">×</button>
      </div>

      <!-- 个性化 -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 10px 12px; background: var(--paper-2, #f3efe6); border-radius: 6px;">
        <span style="font-size: 11px; color: var(--ink-3, #8a8378); white-space: nowrap;">我现在</span>
        <input type="number" id="byok-current" value="${cfg.currentLevel}" min="50" max="160" step="5" style="${inputStyle}; padding: 6px 8px; width: 60px; text-align: center;">
        <span style="color: var(--ink-3, #8a8378);">→</span>
        <span style="font-size: 11px; color: var(--ink-3, #8a8378); white-space: nowrap;">想达到</span>
        <input type="number" id="byok-target" value="${cfg.targetLevel}" min="60" max="160" step="5" style="${inputStyle}; padding: 6px 8px; width: 60px; text-align: center;">
        <span style="font-size: 11px; color: var(--ink-3, #8a8378);">分</span>
      </div>

      <!-- AI 服务 + API Key -->
      <div style="margin-bottom: 10px;">
        <label style="${labelStyle}">AI 服务</label>
        <select id="byok-preset" style="${inputStyle}; cursor: pointer;">
          ${presetOptions}
        </select>
      </div>

      <div id="byok-demo-note" style="display: ${cfg.provider === 'demo' ? 'block' : 'none'}; margin-bottom: 12px; padding: 10px 12px; background: var(--accent-soft, #fbe7d6); border: 1px dashed var(--accent, #d96b2b); border-radius: 6px; font-size: 11.5px; line-height: 1.7; color: var(--accent-ink, #8b3d10);">
        <!-- populated by applyPreset -->
      </div>

      <div id="byok-key-wrap" style="display: ${isLocalProvider || cfg.provider === 'demo' ? 'none' : 'block'}; margin-bottom: 8px;">
        <label style="${labelStyle}">API Key</label>
        <div style="display: flex; gap: 6px;">
          <input type="password" id="byok-key" value="${(cfg.apiKey || '').replace(/"/g, '&quot;')}"
                 placeholder="${initialProvider?.keyHint || 'sk-...'}"
                 style="flex: 1; padding: 8px 10px; border: 1.5px solid var(--ink-4, #c9c2b6); border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; background: var(--paper, #fafaf6); color: var(--ink, #1a1814);">
          <button id="byok-toggle-key" type="button" style="padding: 8px 10px; border: 1.5px solid var(--ink-4, #c9c2b6); background: transparent; border-radius: 6px; cursor: pointer; font-size: 11px;">👁</button>
        </div>
        <div id="byok-docs-line" style="font-size: 11px; margin-top: 4px; display: ${initialProvider?.docs ? 'block' : 'none'};">
          <a id="byok-docs-link" href="${initialProvider?.docs || '#'}" target="_blank" style="color: var(--accent-ink, #8b3d10); text-decoration: underline;">→ 在哪申请 key</a>
        </div>
      </div>

      <details id="byok-advanced-wrap" style="margin-bottom: 14px; ${isLocalProvider || cfg.provider === 'demo' ? 'display: none;' : ''}">
        <summary style="cursor: pointer; font-size: 11px; color: var(--ink-3, #8a8378); padding: 6px 0; user-select: none;">高级设置（自定义 endpoint / model）</summary>
        <div style="margin-top: 8px;">
          <label style="${labelStyle}">API Endpoint URL</label>
          <input type="text" id="byok-apibase" value="${(cfg.apiBase || initialProvider?.apiBase || '').replace(/"/g, '&quot;')}"
                 placeholder="https://api.example.com/v1/chat/completions"
                 style="${inputStyle}; margin-bottom: 8px;">
          <label style="${labelStyle}">Model（留空用默认）</label>
          <input type="text" id="byok-model" value="${(cfg.model || '').replace(/"/g, '&quot;')}"
                 placeholder="${initialProvider?.defaultModel || ''}"
                 style="${inputStyle}">
        </div>
      </details>

      <div id="byok-test-result" style="font-size: 12px; margin-bottom: 10px; min-height: 16px;"></div>

      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="byok-test" type="button" style="padding: 7px 12px; border: 1.5px solid var(--ink, #1a1814); background: transparent; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">🔌 测试</button>
        <button id="byok-save" type="button" style="padding: 7px 14px; border: 1.5px solid var(--ink, #1a1814); background: var(--ink, #1a1814); color: var(--paper, #fafaf6); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">💾 保存</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    function close() { backdrop.remove(); }
    document.getElementById('byok-close').onclick = close;
    backdrop.onclick = e => { if (e.target === backdrop) close(); };

    const $$ = id => document.getElementById(id);

    function applyPreset(provider) {
      const p = PROVIDERS[provider];
      if (!p) return;
      const noKeyNeeded = provider === 'local' || provider === 'demo';
      $$('byok-key-wrap').style.display = noKeyNeeded ? 'none' : 'block';
      $$('byok-advanced-wrap').style.display = noKeyNeeded ? 'none' : 'block';
      if (!noKeyNeeded) {
        $$('byok-apibase').value = p.apiBase || '';
        $$('byok-apibase').placeholder = p.apiBase || 'https://api.example.com/v1/chat/completions';
        $$('byok-key').value = '';
        $$('byok-key').placeholder = p.keyHint || 'sk-...';
        $$('byok-model').value = '';
        $$('byok-model').placeholder = p.defaultModel || '';
      }
      const docsLine = $$('byok-docs-line');
      if (p.docs) {
        docsLine.style.display = 'block';
        $$('byok-docs-link').href = p.docs;
        $$('byok-docs-link').textContent = `→ 在哪申请 ${p.name} key`;
      } else {
        docsLine.style.display = 'none';
      }
      const demoNote = $$('byok-demo-note');
      if (demoNote) {
        if (provider === 'demo') {
          const u = getDemoUsage();
          demoNote.style.display = 'block';
          demoNote.innerHTML = `🎁 <b>限时免费内测中</b><br>不需要任何 API Key 即可使用。共享额度，每个浏览器每天 <b>${DEMO_DAILY_LIMIT} 次</b>，今天还剩 <b>${u.remaining}</b> 次。<br>额度用完或想无限用，下面的下拉换成 DeepSeek + 填自己 5 元的 key。`;
        } else {
          demoNote.style.display = 'none';
        }
      }
    }

    $$('byok-preset').onchange = e => applyPreset(e.target.value);
    $$('byok-toggle-key').onclick = () => {
      const i = $$('byok-key');
      i.type = i.type === 'password' ? 'text' : 'password';
    };

    function readForm() {
      const provider = $$('byok-preset').value;
      return {
        provider,
        currentLevel: parseInt($$('byok-current').value) || 85,
        targetLevel: parseInt($$('byok-target').value) || 115,
        apiKey: ($$('byok-key')?.value || '').trim(),
        model: ($$('byok-model')?.value || '').trim(),
        apiBase: ($$('byok-apibase')?.value || '').trim(),
      };
    }

    $$('byok-test').onclick = async () => {
      const cfgNew = readForm();
      const result = $$('byok-test-result');
      if (cfgNew.provider === 'local') {
        result.innerHTML = '<span style="color: var(--ink-3);">测试本地 server...</span>';
        try {
          const r = await fetch('/api/resources/list');
          if (r.ok) result.innerHTML = '<span style="color: var(--good);">✓ 本地 server 在跑（端口 3737）</span>';
          else result.innerHTML = `<span style="color: var(--bad);">✗ 本地 server 没响应（${r.status}）</span>`;
        } catch (e) {
          result.innerHTML = `<span style="color: var(--bad);">✗ 连不上本地 server：${e.message}。请先 \`node server.js\`</span>`;
        }
        return;
      }
      if (cfgNew.provider !== 'demo' && !cfgNew.apiKey) {
        result.innerHTML = '<span style="color: var(--bad);">✗ 请填 API Key</span>';
        return;
      }
      if (cfgNew.provider !== 'demo' && !cfgNew.apiBase) {
        result.innerHTML = '<span style="color: var(--bad);">✗ 请填 API Endpoint URL</span>';
        return;
      }
      result.innerHTML = '<span class="loading-dots" style="color: var(--ink-3);">测试中</span>';
      const prevCfg = getCfg();
      saveCfg(cfgNew);
      try {
        const out = await callLLM('用一句话回复"连接测试成功"，不要其他内容。');
        result.innerHTML = `<span style="color: var(--good);">✓ 连接成功 · 模型回复: ${(out || '').slice(0, 40)}</span>`;
      } catch (e) {
        result.innerHTML = `<span style="color: var(--bad);">✗ ${e.message}</span>`;
      } finally {
        saveCfg(prevCfg);
      }
    };

    $$('byok-save').onclick = () => {
      const cfgNew = readForm();
      const result = $$('byok-test-result');
      if (cfgNew.targetLevel <= cfgNew.currentLevel) {
        result.innerHTML = '<span style="color: var(--bad);">✗ 目标分要高于当前分</span>';
        return;
      }
      const noKey = cfgNew.provider === 'local' || cfgNew.provider === 'demo';
      if (!noKey && !cfgNew.apiKey) {
        result.innerHTML = '<span style="color: var(--bad);">✗ 请填 API Key</span>';
        return;
      }
      if (!noKey && !cfgNew.apiBase) {
        result.innerHTML = '<span style="color: var(--bad);">✗ 请填 API Endpoint URL</span>';
        return;
      }
      saveCfg(cfgNew);
      updateProviderBadge();
      close();
    };
  }

  function updateProviderBadge() {
    const badge = document.getElementById('byok-badge');
    if (!badge) return;
    const cfg = getCfg();
    if (_hostedMode && cfg.provider === 'local') {
      badge.textContent = '未配置 ↗';
      badge.title = '点击配置 AI provider';
      return;
    }
    if (cfg.provider === 'demo') {
      const u = getDemoUsage();
      badge.textContent = `🎁 免费 · ${u.remaining}/${DEMO_DAILY_LIMIT}`;
      badge.title = `限时免费内测 · 今天还剩 ${u.remaining} 次`;
      return;
    }
    const p = PROVIDERS[cfg.provider];
    badge.textContent = p ? p.name : 'Local';
    badge.title = p ? p.tag : '';
  }

  function injectGearButton() {
    if (document.getElementById('byok-gear')) return;
    const btn = document.createElement('button');
    btn.id = 'byok-gear';
    btn.innerHTML = `<span style="font-size: 14px;">⚙️</span> <span id="byok-badge" style="font-size: 11px; color: var(--ink-3); font-weight: 500;">Local</span>`;
    btn.style.cssText = `
      position: fixed; top: 14px; right: 18px; z-index: 100;
      padding: 6px 12px; background: var(--paper, #fafaf6);
      border: 1.5px solid var(--ink, #1a1814); border-radius: 8px;
      box-shadow: 2px 3px 0 rgba(26,24,20,0.08);
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      font-family: 'PingFang SC', system-ui, sans-serif;
    `;
    btn.onclick = openSettings;
    document.body.appendChild(btn);
    updateProviderBadge();
  }

  function showHostedWelcome() {
    if (localStorage.getItem('det-byok-welcomed')) return;
    // hosted 新用户：自动切到 demo 模式 + 保存
    const cfg = getCfg();
    if (_hostedMode && cfg.provider === 'local') {
      saveCfg({ ...cfg, provider: 'demo' });
      updateProviderBadge();
    }
    openSettings();
    setTimeout(() => {
      const modal = document.querySelector('#byok-modal-backdrop > div');
      if (!modal || document.getElementById('byok-hosted-banner')) return;
      const banner = document.createElement('div');
      banner.id = 'byok-hosted-banner';
      banner.style.cssText = 'background: var(--accent-soft, #fbe7d6); border: 1.5px solid var(--accent, #d96b2b); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; line-height: 1.7; color: var(--accent-ink, #8b3d10);';
      banner.innerHTML = '👋 <b>欢迎使用 DET-scriba 限时免费内测</b><br>填一下当前分和目标分就能直接开始批改，<b>不用任何 API Key</b>。共享额度每天 20 次/浏览器。';
      modal.insertBefore(banner, modal.children[1]);
      const presetSel = document.getElementById('byok-preset');
      if (presetSel) {
        presetSel.value = 'demo';
        presetSel.dispatchEvent(new Event('change'));
      }
      localStorage.setItem('det-byok-welcomed', '1');
    }, 50);
  }

  async function bootstrap() {
    injectGearButton();
    await probeServer();
    updateProviderBadge();
    if (_hostedMode && !localStorage.getItem(STORAGE_KEY)) {
      showHostedWelcome();
    }
  }

  // expose
  window.BYOK = {
    PROVIDERS, getCfg, saveCfg, openSettings, isLocal,
    reviewEssay, generatePrompt, generateModelEssay, generateExample, askTeacher, correctEssay,
    fetchResource, fetchResourceList,
    updateProviderBadge,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
