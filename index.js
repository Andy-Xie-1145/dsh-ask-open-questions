/**
 * ask-open-questions — Host half.
 *
 * Replaces the shipped `ask_user_question` tool with a unified one: every
 * question in one batch may be EITHER a choice question (`options` with an
 * optional `multi_select`) OR an open-ended question (a free-form text box
 * with an agent-authored `placeholder` hint). The batch may mix both shapes
 * freely. `header` and `required` apply to either shape.
 *
 * Replacement mechanism: the shipped plugin registers `ask_user_question` in
 * the global tool layer; this bundle registers the same name on every live
 * agent's own context (and on every future `agent/created`), and scoped
 * registrations shadow the global one for presentation, lookup, and execution
 * alike. No DSH installation file is modified anywhere.
 *
 * Supplementary note: the Web card rendered by this bundle's client half lets
 * the user attach a note that belongs to no question. The card appends it to
 * the answer batch as an item whose id is `__supplement__`; this tool lifts
 * that item into a top-level `supplement` result field. A prompt section
 * registered below teaches the model the convention.
 *
 * This file imports nothing: the definition carries final JSON Schema shapes
 * (the registry projects `parameters` verbatim and validates `output.schema`
 * itself), so the bundle stays independent of module resolution inside the
 * profile's pnpm layout.
 */

export const name = 'ask-open-questions';
export const inject = ['tools', 'userQuestions', 'systemPrompt', 'agents'];

/** Upper bound on questions per call; keeps the form card usable. */
const MAX_QUESTIONS = 8;

/**
 * Reserved answer id carrying the user's own supplementary note. The client
 * card appends it to the batch; it belongs to no question.
 */
const SUPPLEMENT_ID = '__supplement__';

/** Model-facing statement of the supplementary-note convention. */
const SUPPLEMENT_SECTION = [
  '## User supplementary notes on questions',
  'The question card offers an optional supplementary note that belongs to no question.',
  'It arrives as the top-level `supplement` string of the tool result.',
  'Read it as extra user-provided context; its absence means the user added nothing.',
].join(' ');

const DESCRIPTION = [
  'Ask the user one or more questions and wait for the answers. One unified card renders both choice questions and open-ended questions, and a single batch may mix the two shapes freely.',
  'Optional `context`: background information or material shown on the card above the first question; it belongs to no question and needs no answer.',
  'Choice question: give `options` (each `{label, description?}`). The user picks one, or several with `multi_select: true`. Put the recommended option first and append "(Recommended)" to its label.',
  'Open-ended question: give no `options`; the user types free-form text into its own input box. `placeholder` is the hint shown inside the empty box — phrase it as guidance for what a good answer contains, in the user-facing language. Do not invent options just to offer an escape hatch: when the user must write the answer (a path, a description, an opinion), ask an open-ended question.',
  '`header` adds a short section label; `required` marks questions whose empty answer blocks you (optional questions may be left blank, which reports as skipped).',
  'The user sees all questions of one call at once, may attach one supplementary note that belongs to no question, and submits everything as one batch; the call waits until the batch arrives.',
  'The result echoes one item per question as {id, selected, answer, skipped} — `selected` holds chosen option labels (empty for open-ended questions), `answer` holds typed text (the open-ended answer, or custom text entered next to a choice), and `skipped` is true when the user left the question empty. A non-empty top-level `supplement` string is the user\'s own note; it answers no question.',
].join(' ');

/** Non-empty string check for model-supplied fields. */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** Upper bound on the optional context block; keeps the card renderable. */
const MAX_CONTEXT_LENGTH = 20000;

/**
 * Validate the optional batch-level context block.
 * @param {unknown} context - model-supplied context value.
 * @returns {string|undefined} the trimmed context to display.
 */
function validateContext(context) {
  if (context === undefined) return undefined;
  if (typeof context !== 'string' || context.trim() === '') {
    throw new Error('context must be a non-empty string when provided');
  }
  const trimmed = context.trim();
  if (trimmed.length > MAX_CONTEXT_LENGTH) {
    throw new Error(`context must be at most ${MAX_CONTEXT_LENGTH} characters`);
  }
  return trimmed;
}

/**
 * Validate the question batch before opening the foreground wait.
 * @param {Array<Record<string, unknown>>} questions - model-supplied questions.
 */
function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1) {
    throw new Error('ask_user_question requires at least one question');
  }
  if (questions.length > MAX_QUESTIONS) {
    throw new Error(`ask_user_question accepts at most ${MAX_QUESTIONS} questions per call`);
  }
  const ids = new Set();
  for (const question of questions) {
    if (!isNonEmptyString(question.id)) {
      throw new Error('every question needs a non-empty string id');
    }
    if (question.id === SUPPLEMENT_ID) {
      throw new Error(`question id ${SUPPLEMENT_ID} is reserved`);
    }
    if (ids.has(question.id)) {
      throw new Error(`question id ${JSON.stringify(question.id)} must be unique within this call`);
    }
    ids.add(question.id);
    if (!isNonEmptyString(question.question)) {
      throw new Error(`question ${JSON.stringify(question.id)} needs a non-empty string question`);
    }
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;
    if (question.options !== undefined && !hasOptions) {
      throw new Error(`question ${JSON.stringify(question.id)} declares options that are not a non-empty array`);
    }
    if (hasOptions) {
      for (const option of question.options) {
        if (!isNonEmptyString(option.label)) {
          throw new Error(`question ${JSON.stringify(question.id)} has an option without a non-empty string label`);
        }
      }
    }
    if (question.multi_select === true && !hasOptions) {
      throw new Error(`question ${JSON.stringify(question.id)} sets multi_select but offers no options`);
    }
    if (!hasOptions && question.placeholder !== undefined && typeof question.placeholder !== 'string') {
      throw new Error(`question ${JSON.stringify(question.id)} placeholder must be a string`);
    }
  }
}

/**
 * Translate a model question into the service question object. `placeholder`
 * and `required` are this bundle's own fields: the service forwards unknown
 * fields verbatim, so the client card can recognise and render them.
 * @param {Record<string, unknown>} question - model-supplied question.
 * @returns {Record<string, unknown>} service question object.
 */
function toServiceQuestion(question) {
  const options = Array.isArray(question.options) && question.options.length > 0
    ? question.options.map((option) => ({
      label: option.label,
      ...(typeof option.description === 'string' && option.description !== ''
        ? { description: option.description }
        : {}),
    }))
    : undefined;
  return {
    id: question.id,
    question: question.question,
    ...(typeof question.header === 'string' && question.header !== '' ? { header: question.header } : {}),
    ...(options !== undefined ? { options } : {}),
    ...(question.multi_select === true ? { multiSelect: true } : {}),
    ...(options === undefined && typeof question.placeholder === 'string' && question.placeholder !== ''
      ? { placeholder: question.placeholder }
      : {}),
    ...(question.required === true ? { required: true } : {}),
  };
}

/**
 * Build the unified tool definition. Fresh object per agent scope; execution
 * resolves `userQuestions` through the composition root captured here, which
 * is the same service instance the agent scope resolves to.
 * @param {object} ctx - composition-root context.
 * @returns {object} registry-ready tool definition.
 */
function makeDefinition(ctx) {
  return {
    name: 'ask_user_question',
    description: DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: 'Optional background information or material for this batch, shown on the card above the first question. It belongs to no question and needs no answer; keep it to what helps the user decide.',
        },
        questions: {
          type: 'array',
          description: `One to ${MAX_QUESTIONS} questions; each is a choice question (with options) or an open-ended question (without). Choice and open-ended questions may mix freely in one batch.`,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: {
                type: 'string',
                description: 'Stable id for this question; echoed in the answer.',
              },
              question: {
                type: 'string',
                description: 'The question itself, shown above the answer area.',
              },
              options: {
                type: 'array',
                description: 'Choices that make this a choice question. Omit to ask an open-ended question answered as free-form text.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    label: {
                      type: 'string',
                      description: 'Short user-facing option label. Mark a recommendation by appending "(Recommended)".',
                    },
                    description: {
                      type: 'string',
                      description: 'One sentence explaining the tradeoff or impact.',
                    },
                  },
                  required: ['label'],
                },
              },
              multi_select: {
                type: 'boolean',
                description: 'Whether the user may select more than one option. Defaults to single-select.',
              },
              placeholder: {
                type: 'string',
                description: 'Open-ended questions only: hint shown inside the empty answer box (floating placeholder text). Describe what a good answer contains; use the user-facing language.',
              },
              header: {
                type: 'string',
                description: 'Optional short heading for this question, such as "Confirm" or "背景".',
              },
              required: {
                type: 'boolean',
                description: 'True when an empty answer blocks you. Defaults to optional.',
              },
            },
            required: ['id', 'question'],
          },
        },
      },
      required: ['questions'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answers: {
            type: 'array',
            description: 'One item per question, in question order.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', description: 'The question id echoed from the request.' },
                selected: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Chosen option labels; empty for open-ended questions.',
                },
                answer: {
                  type: 'string',
                  description: "Typed text: the open-ended answer, or the custom text entered next to a choice; empty when none.",
                },
                custom: {
                  type: 'string',
                  description: 'Same text as `answer`, kept under the conventional field name.',
                },
                skipped: {
                  type: 'boolean',
                  description: 'True when the user submitted this question empty.',
                },
              },
              required: ['id', 'selected', 'answer', 'skipped'],
            },
          },
          supplement: {
            type: 'string',
            description: "The user's supplementary note. Belongs to no question; omitted when the user added none.",
          },
        },
        required: ['answers'],
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      validateQuestions(args.questions);
      const context = validateContext(args.context);
      const serviceQuestions = args.questions.map(toServiceQuestion);
      // The service card layer reads per-question fields only, so the
      // batch-level context rides on the first question; the client half
      // lifts it back out and renders it above the questions.
      if (context !== undefined) serviceQuestions[0].context = context;
      const result = await ctx.userQuestions.ask({
        questions: serviceQuestions,
        ...(exec.agent !== undefined ? { agent: exec.agent } : {}),
        signal: exec.signal,
        // Key the client card to this tool call, so closing the card only
        // hides it and the transcript row can bring it back.
        wait: { callId: exec.callId },
      });
      const answers = [];
      let supplement;
      for (const answer of result.answers) {
        if (answer.id === SUPPLEMENT_ID) {
          supplement = typeof answer.custom === 'string' ? answer.custom : '';
          continue;
        }
        const selected = Array.isArray(answer.selected) ? [...answer.selected] : [];
        const text = typeof answer.custom === 'string' ? answer.custom : '';
        answers.push({
          id: answer.id,
          selected,
          answer: text,
          ...(text !== '' ? { custom: text } : {}),
          skipped: selected.length === 0 && text === '',
        });
      }
      return supplement !== undefined && supplement !== ''
        ? { answers, supplement }
        : { answers };
    },
  };
}

/** Agent targets already carrying the scoped replacement. */
const replaced = new WeakSet();

/**
 * Register the scoped replacement on one agent's own context. A scoped
 * registration shadows the shipped global tool for presentation, lookup, and
 * execution; the registration dies with the agent's context.
 * @param {object} ctx - composition-root context.
 * @param {object} agent - live agent.
 */
function replaceFor(ctx, agent) {
  if (agent === undefined || replaced.has(agent)) return;
  try {
    const disposer = agent.ctx.tools.register(makeDefinition(ctx));
    replaced.add(agent);
    // Second owner: keep the disposer in this plugin's own effect too, so
    // unloading the bundle removes the replacement even while agents live on.
    // cordis runs an effect body immediately and collects what it YIELDS, so
    // the disposer must be yielded by a generator — passing it directly would
    // execute the undo on the spot and silently unregister the tool.
    ctx.effect(function* () { yield disposer; }, 'ask-open-questions: replacement');
  } catch {
    // A scope that already carries the name (or a dying agent) keeps whatever
    // is registered; failing loudly here would break agent startup.
  }
}

export function apply(ctx, _config = {}) {
  // Teach the model the supplementary-note convention (global prompt section).
  ctx.systemPrompt.section({
    name: 'ask-open-questions: supplement',
    order: 10000,
    text: SUPPLEMENT_SECTION,
  });
  // Live agents at activation time.
  for (const agent of ctx.agents.list()) replaceFor(ctx, agent);
  // Every future agent (fresh creation, resume, teammates, subagents).
  ctx.on('agent/created', ({ agent }) => replaceFor(ctx, agent));
}
