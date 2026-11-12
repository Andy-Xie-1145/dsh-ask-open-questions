# dsh-ask-open-questions

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
![DSH >=0.2 <0.4](https://img.shields.io/badge/dsh-%3E%3D0.2%20%3C0.4-4D6BFE?style=flat-square)

一个 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)组合包，把自带的
`ask_user_question` 工具升级为**统一提问卡**。两大招牌升级：批次级**背景材料块**把上下文直接
渲染在卡片上——不用翻回模型回复拼凑"到底在问什么"，也不会与卡片 UI 抢地方；**一等公民开放题**
带原生 `placeholder` 悬浮提示，是显式的题型而不是挂在选择题上的自由文本附属。在此之上：选择
题与开放题一次调用自由混排、每题 `required` 标记、以及一条不对应任何问题的补充说明。对官方
工具是遮蔽替换而非修改——不动任何 DSH 安装文件。

English documentation: [README.md](./README.md)。

## 官方工具 vs. 本插件

| 能力 | 官方 `ask_user_question` | dsh-ask-open-questions |
| --- | --- | --- |
| 卡片形态 | 逐题翻页，一次只看一题 | 单卡全览，所有问题同屏；选择/开放题自由混排 |
| 开放题输入 | 自由文本框，占位文案固定（"输入你的答案"） | 开放题可携带 agent 自拟的 `placeholder` 悬浮提示 |
| required 语义 | 固定 UI：每题必须作答或显式跳过 | 每题 `required` 标记——留空即阻塞 agent |
| 补充说明 | — | 批次级备注，不对应任何问题，以顶层 `supplement` 字符串送达 |
| 批次背景块 | —（服务层有题级 `detail` 字段，但工具侧无法设置） | `context` 字符串，渲染在卡片标题下方、第一个问题上方 |
| 批次超时 | 可选 timed 模式（默认 120 秒、可逐调用覆盖；超时返回 `pending`，问题保持可答） | 始终前台等待至提交；中止回合即取消等待 |
| 官方特殊卡 | —（原生） | timed 倒计时卡与 plan-review 审批卡原样放行 |

## 功能

- **背景材料直接呈现**：模型可传入可选的 `context` 字符串（背景信息/材料）；卡片在标题下方、
  第一个问题上方渲染该区块。用户在做选择的当下就看到全貌，无需翻阅对话拼凑上下文；区块是卡片
  自身的一部分，不会与卡片 UI 冲突。它不对应任何问题，也无需回答。
- **显式开放题**：开放题是一等题型，答案框内带原生、agent 自拟的 `placeholder` 悬浮提示——
  而不是附着在选择题上的自由文本附属品。
- **一张统一卡片**：同一批次内可任意混排选择题（单选/多选、可标推荐）与开放题。
- **每题元数据**：`header`（分区标题）与 `required`（留空即阻塞）对两种题型均适用。
- **补充说明**：卡片有"添加补充说明"入口；用户所写以顶层 `supplement` 字符串送达模型，
  不对应任何问题。
- **结构化结果**：每题一项、按提问顺序返回：

  ```json
  {
    "answers": [
      { "id": "deploy_env", "selected": ["Staging (Recommended)"], "answer": "", "skipped": false },
      { "id": "rollout_note", "selected": [], "answer": "please avoid Friday evening", "custom": "please avoid Friday evening", "skipped": false }
    ],
    "supplement": "the staging cluster is shared with the docs team"
  }
  ```
- **双语界面**：卡片文案跟随浏览器语言（English / 简体中文）。
- **兼容官方卡片**：客户端半区对官方的 timed 倒计时卡与 plan-review 审批卡原样放行。

## 工作原理

组合包分两半：

- **Host 半区（`index.js`）**：在每个存活 agent 自己的 context 上注册同名 `ask_user_question`
  工具（并通过 `agent/created` 覆盖未来 agent）。scoped 注册在展示、查找、执行三个通道上遮蔽
  官方全局工具，因此模型看到的只有一个工具——统一版。官方工具仍保留在底层，作为替换未能安装
  的 agent 的兜底。不修改任何 DSH 安装文件。
- **Client 半区（`client.js`）**：web 客户端插件，仅用主题 token 渲染统一卡片，把补充说明以
  保留 id `__supplement__` 追加进答案批次，并支持从消息记录重新打开已收起的卡片。Host 工具将
  该条目提升为顶层 `supplement` 字段。

Host 半区还注册了一段 prompt section，向模型说明两种题型、placeholder 约定与补充说明约定。

## 安装

把仓库 clone 到任意位置，然后将该目录作为组合包安装进 DSH profile：

- 使用 `plugin_manager` 工具：`action: "install_bundle"`，`target` 为 clone 出来的绝对路径，
  包安装与组合包选择会自动完成。
- 或在 DSH Web 插件页指向该目录安装。

修改 `index.js` / `client.js` 后，重启 DSH 即生效（profile 以 link 方式引用目录，不做拷贝）。

> 更新组合包后，请**新开对话**让刷新后的工具定义送达模型；进行中的对话沿用其创建时的工具契约。

## 兼容性

- **支持的 DSH 范围：`>=0.2.0-0 <0.4`**（通过 `engines.dsh` 声明，预发布版本参与匹配）。
  已在 `0.2.1-rc.5` 上构建并验证。范围覆盖整个 `0.2.x` 与 `0.3.x`，后续版本可直接安装、无需
  人工豁免；`0.1.x` 与 `0.4+` 会被拒绝——本组合包依赖的 scoped 工具注册表面不保证在那些版本
  可用。超出范围时 DSH 会阻止激活，并提供显式版本豁免流程（`dsh plugin allow-version` 或插件
  管理器），风险自担。
- 基于 DSH cordis 工具注册表的 scoped-layer 遮蔽机制构建并测试（经 `agent.ctx` 调用的
  `tools.register`）。
- 客户端半区声明了对 `@deepseek-ai/dsh-client-ui-user-questions` 与
  `@deepseek-ai/dsh-client-ui-conversation` 的注入依赖。

## 许可证

[MIT](./LICENSE)
