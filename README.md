# dsh-ask-open-questions

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
![DSH >=0.2 <0.4](https://img.shields.io/badge/dsh-%3E%3D0.2%20%3C0.4-4D6BFE?style=flat-square)

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) bundle that turns the
shipped `ask_user_question` tool into a **unified question card**. Two headline upgrades: a batch
**context block** that renders the background material right on the card — no scrolling back
through the model's reply to reconstruct what is being asked, and no fighting with the card UI —
and **first-class open-ended questions** with a native floating `placeholder` hint, explicit
question shapes rather than a free-text box bolted onto choice options. On top of that: choice and
open-ended questions mix freely in one call, per-question `required` flags, and a supplementary
note that answers nothing. The shipped tool is shadowed, not modified — no DSH installation file is
touched.

中文说明见 [README.zh-CN.md](./README.zh-CN.md)。

## Shipped tool vs. this bundle

| Capability | Shipped `ask_user_question` | dsh-ask-open-questions |
| --- | --- | --- |
| Card layout | One question at a time, paginated | Single card with every question visible; choice and open-ended questions mixed freely |
| Open-ended input | Free-text box with fixed placeholder text ("Type your answer") | Open-ended questions with a model-authored `placeholder` hint |
| Required semantics | Fixed UI: every question must be answered or explicitly skipped | Per-question `required` flag — an empty answer blocks the agent |
| Supplementary note | — | Batch-level note that belongs to no question, delivered as the top-level `supplement` string |
| Batch context | — (the service has a per-question `detail` field, but the tool cannot set it) | `context` string rendered under the card title, above the first question |
| Batch timeout | Optional timed mode (120 s default, per-call override; expiry returns `pending` and the questions stay answerable) | Always waits in the foreground until submitted; aborting the turn cancels the wait |
| Shipped special cards | — (native) | Timed countdown cards and plan-review approval cards pass through untouched |

## What you get

- **Batch context on the card.** The model may pass an optional `context` string (background
  information or material); the card renders it between the title and the first question. The user
  sees the full picture at the moment of choice instead of excavating the conversation, and the
  block is part of the card itself, so it never collides with the card UI. It belongs to no
  question and needs no answer.
- **Explicit open-ended questions.** An open question is a first-class question shape with a
  native, agent-authored `placeholder` hint floating in the answer box — not a free-text afterthought
  attached to a choice question.
- **One unified card.** A single batch may contain any mix of choice questions (single- or
  multi-select, with a recommended option) and open-ended questions.
- **Per-question metadata.** `header` (short section label) and `required` (empty answer blocks
  the agent) apply to either shape.
- **Supplementary note.** The card carries an "Add a note" entry; whatever the user types there
  arrives at the model as a top-level `supplement` string — it answers no question.
- **Structured result.** One item per question, in question order:

  ```json
  {
    "answers": [
      { "id": "deploy_env", "selected": ["Staging (Recommended)"], "answer": "", "skipped": false },
      { "id": "rollout_note", "selected": [], "answer": "please avoid Friday evening", "custom": "please avoid Friday evening", "skipped": false }
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
  own context (and on every future agent via `agent/created`). A scoped registration shadows the
  shipped global tool for presentation, lookup, and execution alike, so the model sees exactly one
  tool: the unified one. The shipped tool stays registered underneath as a fallback for any agent
  the replacement could not be installed on. No DSH installation file is modified.
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

> After updating the bundle, open a **new conversation** so the refreshed tool definition reaches
> the model; conversations already in flight keep the tool contract they were created with.

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
