# dsh-ask-open-questions

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) bundle that replaces the shipped
`ask_user_question` tool with a **unified question card**: one tool call can mix choice questions
and open-ended questions freely, and the user can attach a supplementary note that belongs to no
question.

> 中文说明见下方 [中文](#中文) 章节。

## What you get

- **One unified card.** A single batch may contain any mix of choice questions (single- or
  multi-select, with a recommended option) and open-ended questions (free-form text box with an
  agent-authored `placeholder` hint).
- **Per-question metadata.** `header` (short section label) and `required` (empty answer blocks the
  agent) apply to either shape.
- **Supplementary note.** The card carries an "Add a note" entry; whatever the user types there
  arrives at the model as a top-level `supplement` string — it answers no question.
- **Structured result.** One item per question, in question order:

```json
{
  "answers": [
    { "id": "deploy_env", "selected": ["Staging (Recommended)"], "answer": "", "skipped": false },
    { "id": "rollout_note", "selected": [], "answer": "please avoid Friday evening", "skipped": false }
  ],
  "supplement": "the staging cluster is shared with the docs team"
}
```

- **Bilingual UI.** The card copy follows the browser language (English / 简体中文).
- **Shipped-card compatible.** The client half deliberately passes through the shipped timed
  countdown card and the plan-review approval card untouched.

## How it works

The bundle has two halves:

- **Host half (`index.js`)** — registers a same-name `ask_user_question` tool on every live agent's
  own context (and on every future `agent/created` via `agent/created`). A scoped registration
  shadows the shipped global tool for presentation, lookup, and execution alike, so the model sees
  exactly one tool: the unified one. The shipped tool stays registered underneath as a fallback for
  any agent the replacement could not be installed on. No DSH installation file is modified.
- **Client half (`client.js`)** — a web client plugin that renders the unified card with theme
  tokens only, appends the supplementary note to the answer batch under the reserved id
  `__supplement__`, and re-opens a closed card from its transcript row. The Host tool lifts that
  item into the top-level `supplement` field.

A prompt section registered by the Host half teaches the model the question shapes, the
placeholder convention, and the supplementary-note convention.

## Install

Clone the repo anywhere, then install the bundle directory into your DSH profile:

- Via the `plugin_manager` tool: `action: "install_bundle"`, `target` = the absolute path of the
  cloned directory. It runs the package installation and bundle selection for you.
- Or via the DSH web plugin page, pointing it at the cloned directory.

Changes to `index.js` / `client.js` take effect on the next DSH restart (the profile links the
directory, it does not copy it).

## Compatibility

- **Supported DSH range: `>=0.2.0-0 <0.4`** (declared as `engines.dsh`; prereleases participate).
  Built and verified on `0.2.1-rc.5`. The range covers the whole `0.2.x` line and `0.3.x`, so
  forward releases install without any manual approval; `0.1.x` and `0.4+` are refused because the
  scoped tool-registry surface the bundle relies on is not guaranteed there. On an out-of-range
  runtime, DSH blocks activation and offers an explicit version exemption
  (`dsh plugin allow-version`, or the plugin manager) if you accept the risk.
- Built and tested against DSH's cordis tool registry with scoped-layer shadowing
  (`tools.register` through `agent.ctx`).
- The client half declares its injections so it composes with
  `@deepseek-ai/dsh-client-ui-user-questions` and `@deepseek-ai/dsh-client-ui-conversation`.

## License

[MIT](./LICENSE)

---

## 中文

一个 DeepSeek Harness（DSH）组合包，把自带的 `ask_user_question` 工具替换为**统一提问卡**：
一次调用即可自由混排选择题与开放题，用户还可以附加一条不对应任何问题的补充说明。

### 功能

- **一张统一卡片**：同一批次内可任意混排选择题（单选/多选、可标推荐）与开放题（文本框 +
  agent 自拟的 `placeholder` 悬浮提示）。
- **每题元数据**：`header`（分区标题）与 `required`（留空即阻塞）对两种题型均适用。
- **补充说明**：卡片底部有"添加补充说明"入口；用户所写以顶层 `supplement` 字符串送达模型，
  不对应任何问题。
- **结构化结果**：每题一项、按提问顺序返回（示例见上方英文段落）。
- **双语界面**：卡片文案跟随浏览器语言（English / 简体中文）。
- **兼容官方卡片**：客户端半区对官方的 timed 倒计时卡与 plan-review 审批卡原样放行。

### 工作原理

- **Host 半区（`index.js`）**：在每个存活 agent 自己的 context 上注册同名 `ask_user_question`
  工具（并通过 `agent/created` 覆盖未来 agent）。scoped 注册在展示、查找、执行三个通道上遮蔽
  官方全局工具，因此模型看到的只有一个工具——统一版。官方工具仍保留在底层，作为替换未能安装
  的 agent 的兜底。不修改任何 DSH 安装文件。
- **Client 半区（`client.js`）**：web 客户端插件，仅用主题 token 渲染统一卡片，把补充说明以
  保留 id `__supplement__` 追加进答案批次，并支持从消息记录重新打开已收起的卡片。Host 工具将该
  条目提升为顶层 `supplement` 字段。

Host 半区还注册了一段 prompt section，向模型说明两种题型、placeholder 约定与补充说明约定。

### 兼容性

- **支持的 DSH 范围：`>=0.2.0-0 <0.4`**（通过 `engines.dsh` 声明，预发布版本参与匹配）。
  已在 `0.2.1-rc.5` 上构建并验证。范围覆盖整个 `0.2.x` 与 `0.3.x`，后续版本可直接安装、无需
  人工豁免；`0.1.x` 与 `0.4+` 会被拒绝——本组合包依赖的 scoped 工具注册表面不保证在那些版本
  可用。超出范围时 DSH 会阻止激活，并提供显式版本豁免流程（`dsh plugin allow-version` 或插件
  管理器），风险自担。
- 基于 DSH cordis 工具注册表的 scoped-layer 遮蔽机制构建并测试（经 `agent.ctx` 调用的
  `tools.register`）。
- 客户端半区声明了对 `@deepseek-ai/dsh-client-ui-user-questions` 与
  `@deepseek-ai/dsh-client-ui-conversation` 的注入依赖。

### 安装

把仓库 clone 到任意位置，然后将该目录作为组合包安装进 DSH profile：

- 使用 `plugin_manager` 工具：`action: "install_bundle"`，`target` 为 clone 出来的绝对路径，
  包安装与组合包选择会自动完成。
- 或在 DSH Web 插件页指向该目录安装。

修改 `index.js` / `client.js` 后，重启 DSH 即生效（profile 以 link 方式引用目录，不做拷贝）。

## 许可证

[MIT](./LICENSE)

