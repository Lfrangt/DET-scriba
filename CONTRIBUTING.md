# 贡献指南

欢迎给 DET-scriba 提 PR。这是个公益开源项目，目标帮中国学生考过 DET 进好大学。

## 本地开发

```bash
git clone https://github.com/Lfrangt/DET-scriba.git
cd DET-scriba
node server.js
# 打开 http://localhost:3737
```

三种运行模式，任选其一：

- **Local Claude CLI**（默认）：`node server.js`，需要本机装 Claude Code CLI
- **Local Codex CLI**：`DET_CLI=codex node server.js`，需要本机装 OpenAI Codex CLI
- **BYOK**：在浏览器设置模态框里选 provider + 粘贴 API key，不依赖任何本地 CLI

## 代码结构

- `server.js` — Node HTTP server，5 个 endpoint 都 spawn 本地 CLI（claude / codex）
- `byok.js` — 浏览器端 BYOK 层；提供 provider 抽象 + 设置模态框
- `index.html` — 单文件前端
- `resources/` — 登登教育官方备考资料

## 关于 prompt

5 大 prompt（writing sample / interactive / model essay / teacher / correction）目前在 `server.js` 和 `byok.js` 里**双份维护**。

- 想改 prompt：两边都改，保持一致
- 想做 prompt 抽取到独立模块的重构 PR：欢迎

## 代码风格

- 零依赖，零 build step，纯 vanilla JS
- 注释中文 OK
- 不要堆 framework

## PR 规范

- 标题简洁（< 70 字符），写"做什么"不写"为啥"（为啥放 description）
- 改了 prompt：标注是否两边都同步
- 改了 UI/UX：在 Local CLI 和 BYOK 两种模式下都试一下截图
- 改了 `server.js`：至少跑过 `node -c server.js` 语法检查

## 报 bug

请说明：

- 使用的模式（Local Claude / Local Codex / BYOK）
- 如果是 BYOK，注明 provider（DeepSeek / OpenAI / Anthropic / 等）
- 复现步骤
- 期望行为
- 实际行为

## 行为准则

互相尊重，少争论多动手。
