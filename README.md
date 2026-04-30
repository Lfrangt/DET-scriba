# 📝 DET 写作精批

> 给 DET（Duolingo English Test）考生用的写作精批工具 — 7 维度评分 + 错误清单 + 115 级改写。仿登登教育精批格式。

面向：备考 UBC、美本、其他英语录取要求学校的中国 DET 考生。

🌐 **在线试用（无需安装）**：[det-scriba.vercel.app](https://det-scriba.vercel.app) — 自带 API key（推荐 [DeepSeek](https://platform.deepseek.com/api_keys)，5 块够批 1000+ 次）即可使用。

## Demo

TODO: 加截图

---

## 三种使用方式

| 路径 | 适合谁 | LLM 调用方式 | 额外成本 |
|---|---|---|---|
| 1. Claude CLI | Claude Max 订户 | 本地 spawn `claude -p` | 走订阅，0 |
| 2. Codex CLI | ChatGPT Plus / Pro 订户 | 本地 spawn `codex` | 走订阅，0 |
| 3. BYOK | 任何人 | 浏览器直连 API | 按 token 计费 |

### 路径 1：Claude Max 订户（Claude Code CLI）

前提：已装 [Claude Code CLI](https://claude.com/claude-code) 并 `claude login` 完成 OAuth。

```bash
git clone https://github.com/Lfrangt/DET-scriba.git
cd DET-scriba
node server.js
# 打开 http://localhost:3737
```

### 路径 2：ChatGPT Plus/Pro 订户（OpenAI Codex CLI）

前提：已装 [Codex CLI](https://github.com/openai/codex) 并登录 ChatGPT 账号。

```bash
git clone https://github.com/Lfrangt/DET-scriba.git
cd DET-scriba
DET_CLI=codex node server.js
# 打开 http://localhost:3737
```

### 路径 3：BYOK（推荐 DeepSeek，5 块够批 1000+ 次）

前提：浏览器能跑就行，不需要任何 CLI。

```bash
git clone https://github.com/Lfrangt/DET-scriba.git
cd DET-scriba
node server.js
```

打开 `http://localhost:3737` → 点右上角 ⚙️ → 选 provider → 粘 API key → 保存。所有 LLM 请求从浏览器直连 provider，server 只是托管静态文件。

支持的 provider：
- **DeepSeek**（推荐，最便宜）— 去 [platform.deepseek.com](https://platform.deepseek.com) 申请
- **Anthropic** — 去 [console.anthropic.com](https://console.anthropic.com) 申请
- **OpenAI** — 去 [platform.openai.com](https://platform.openai.com) 申请
- **Custom OpenAI-compatible** — 任意 OpenAI 兼容端点（自填 base URL）

---

## ⚠️ 重要警告：订阅 ≠ API Access

**ChatGPT Plus / Claude Max / 多邻国会员都是网页订阅，不等于 API key。**

如果你想在 BYOK 模式用 OpenAI 或 Anthropic：
- 必须去 `platform.openai.com` / `console.anthropic.com` **单独申请 API key**
- API 是**独立计费**的，跟你网页订阅没关系
- 不会因为你买了 ChatGPT Plus 就能白嫖 OpenAI API

**想用订阅免费跑就走路径 1（Claude Max）或路径 2（ChatGPT Plus/Pro）。**

---

## 快速开始

```bash
git clone https://github.com/Lfrangt/DET-scriba.git
cd DET-scriba
node server.js
```

浏览器打开 `http://localhost:3737`，粘题目 + 答案，点"精批"，等 30-60 秒。

---

## 功能

- **7 维度雷达图**评分（内容 / 结构 / 语法准确 / 语法复杂 / 词汇深度 / 词汇多样 / 篇幅）
- **DET 估分** + IELTS / CEFR 等价
- **错误清单**按严重度排序
- **5 段式结构分析**
- **115 级改写**（直接抄走）
- **5 个万能句式**（每题专用）
- **历史记录**（localStorage，最多 30 条）
- **导出 Markdown** / 一键复制改写段
- **三种 LLM 后端**自由切换（Claude CLI / Codex CLI / BYOK）

---

## 架构概览

后端是纯 Node.js（**零 npm 依赖**，只用内置 `http` 和 `child_process`）。前端单文件 HTML，CDN 加载 Tailwind / Chart.js / marked.js。BYOK 模式下浏览器直连 provider，server 不碰 API key。

```
DET-scriba/
├── server.js       # 本地 HTTP 服务器（spawn claude / codex CLI）
├── byok.js         # 客户端 BYOK 层（provider 抽象 + 设置弹窗）
├── index.html      # 前端单文件
├── resources/      # 登登教育官方 DET 备考资料（评分校准用）
├── run.sh          # 启动脚本
└── README.md
```

默认端口 3737，改 `server.js` 顶部 `PORT` 变量。

---

## DET 评分校准

本项目按 **DET 官方 holistic scoring** 校准（不是 IELTS Task 2 那套标准）。

参考数据：2024-2025 全球考生平均 **110.59**，**115 = 中上水平**。批改严格度对齐登登教育 7 维度精批。

---

## 致谢

评分体系和写作模板参考 [登登教育](https://www.dengdengedu.com)（DET 中文培训机构）公开教学资料。`resources/` 目录下是登登公开发布的备考材料，仅用于评分模型校准。

---

## License

MIT — 见 [LICENSE](./LICENSE)。

## 贡献

见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

Author: Khalil Wu (吴昊格) · GitHub [@Lfrangt](https://github.com/Lfrangt)
