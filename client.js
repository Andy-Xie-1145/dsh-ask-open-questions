window.__ModuleLoader__.load({
  id: '@local/ask-open-questions',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // Reserved answer id that carries the user's own supplementary note. It
    // belongs to no question; the Host tool descriptions and the prompt
    // section registered by this bundle's Host half explain it to the model.
    const SUPPLEMENT_ID = '__supplement__';

    // ---------------------------------------------------------------------------
    // Copy (bilingual, resolved once per browser)
    // ---------------------------------------------------------------------------
    const isZh = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '');
    const T = isZh ? {
      title: 'Agent 向你提问',
      submit: '提交回答',
      submitting: '提交中…',
      close: '收起(可从消息记录重新打开)',
      errorRequired: '还有必答题未填写',
      errorSubmit: '提交失败,请重试',
      skipped: '(未回答,已跳过)',
      answeredTag: '已回答',
      reviewTitle: '问卷回答',
      fallbackPlaceholder: '输入你的回答…',
      customPlaceholder: '输入你的答案',
      required: '必答',
      recommended: '推荐',
      contextLabel: '背景材料',
      supplementAdd: '添加补充说明',
      supplementTitle: '补充说明',
      supplementPlaceholder: '想额外告诉 Agent 的信息,不对应任何问题…',
    } : {
      title: 'Agent asks you',
      submit: 'Submit answers',
      submitting: 'Submitting…',
      close: 'Hide (reopen from the transcript row)',
      errorRequired: 'A required question is still empty',
      errorSubmit: 'Submission failed, please retry',
      skipped: '(left empty, skipped)',
      answeredTag: 'Answered',
      reviewTitle: 'Question answers',
      fallbackPlaceholder: 'Type your answer…',
      customPlaceholder: 'Type your answer',
      required: 'required',
      recommended: 'Recommended',
      contextLabel: 'Context',
      supplementAdd: 'Add a note',
      supplementTitle: 'Supplementary note',
      supplementPlaceholder: 'Anything else you want to tell the agent — belongs to no question…',
    };

    // ---------------------------------------------------------------------------
    // Styles — theme tokens only, rendered as a React element so unmount removes
    // them. The frame centers the card the same way the shipped question card
    // does; option, checkbox, badge, and inline-custom styles are renamed copies
    // of the shipped composer's, keeping only token references.
    // ---------------------------------------------------------------------------
    const CSS = `
.aoq-frame{box-sizing:border-box;width:100%;display:flex;justify-content:center;
  padding:6px calc(var(--dsh-composer-side-clearance, 24px) + 16px) 10px}
.aoq-card{width:100%;max-width:var(--dsh-chat-content-width,720px);box-sizing:border-box;
  background:var(--dsw-specific-input-major,var(--dsw-alias-bg-layer-1));border:0;
  border-radius:var(--dsw-radius-xl,12px);box-shadow:var(--dsw-elevation-panel,0 4px 16px rgba(0,0,0,.12));
  color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;max-height:min(62vh,540px);
  overflow:hidden;font-size:14px;line-height:1.55;text-align:left}
.aoq-head{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.aoq-title{font-size:12px;font-weight:600;letter-spacing:.03em;color:var(--dsw-alias-label-secondary)}
.aoq-close{flex-shrink:0;background:none;border:none;cursor:pointer;width:24px;height:24px;
  padding:0;border-radius:999px;display:grid;place-items:center;
  color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1}
.aoq-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.aoq-body{overflow-y:auto;padding:2px 16px 6px}
.aoq-q{padding:12px 0}
.aoq-q+.aoq-q{border-top:1px solid var(--dsw-alias-border-l1)}
.aoq-context{padding:12px 0 2px}
.aoq-qheader{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;
  color:var(--dsw-alias-label-secondary);margin-bottom:4px}
.aoq-qtext{font-weight:500;margin-bottom:8px;white-space:pre-wrap;word-break:break-word}
.aoq-req{color:var(--dsw-alias-state-warn-primary);font-size:11px;font-weight:600;margin-left:6px}
.aoq-textarea{display:block;width:100%;box-sizing:border-box;min-height:64px;max-height:220px;resize:vertical;
  background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;
  padding:8px 10px;color:var(--dsw-alias-label-primary);font:inherit;line-height:1.5}
.aoq-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.aoq-textarea:disabled{opacity:.6}
.aoq-textarea::placeholder{color:var(--dsw-alias-label-secondary);opacity:.85}
.aoq-answer{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);
  border-radius:8px;padding:8px 10px;white-space:pre-wrap;word-break:break-word}
.aoq-skipnote{color:var(--dsw-alias-label-secondary);font-style:italic}
.aoq-options{display:flex;flex-direction:column;gap:2px}
.aoq-option{border-radius:var(--dsw-radius-md,8px);width:100%;min-height:40px;color:inherit;text-align:left;
  cursor:pointer;background:transparent;border:1px solid transparent;flex-shrink:0;align-items:flex-start;
  gap:8px;padding:8px 12px 8px 8px;transition:background-color .12s,border-color .12s;display:flex;font:inherit}
.aoq-option:hover:enabled,.aoq-optionSel{background:var(--dsw-alias-interactive-bg-hover)}
.aoq-optionSel{border-color:var(--dsw-alias-border-l2)}
.aoq-option:disabled{cursor:default;opacity:.6}
.aoq-num{border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-bg-overlay);width:20px;height:20px;
  color:var(--dsw-alias-label-secondary);flex:0 0 20px;display:grid;place-items:center;margin-top:2px;
  font-size:12px;font-weight:500;line-height:18px}
.aoq-cb{flex:0 0 20px;width:20px;height:20px;margin-top:2px;display:grid;place-items:center}
.aoq-cb::before{content:"";border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xs,4px);
  grid-area:1/1;width:14px;height:14px;transition:background-color .12s,border-color .12s}
.aoq-cbOn{color:var(--dsw-alias-label-primary-foreground,#fff)}
.aoq-cbOn::before{border-color:var(--dsw-alias-label-primary);background:var(--dsw-alias-label-primary)}
.aoq-cb>span{grid-area:1/1;font-size:11px;font-weight:700;line-height:1}
.aoq-optCopy{flex:1;min-width:0}
.aoq-optLine{flex-wrap:wrap;align-items:baseline;gap:2px 6px;display:flex}
.aoq-optLabel{font-size:14px;font-weight:500;line-height:24px}
.aoq-badge{border-radius:var(--dsw-radius-xs,4px);
  background:var(--dsw-specific-sidebar-nav-item-active-accent,var(--dsw-alias-bg-layer-2));
  color:var(--dsw-alias-button-info-fill,var(--dsw-alias-brand-primary));
  padding:0 4px;font-size:11px;font-weight:600;line-height:18px}
.aoq-optDesc{color:var(--dsw-alias-label-secondary);font-size:14px;font-weight:400;line-height:24px}
.aoq-crow{border-radius:var(--dsw-radius-md,8px);border:1px solid transparent;flex-shrink:0;
  align-items:flex-start;gap:8px;width:100%;min-height:40px;padding:8px 12px 8px 8px;
  transition:background-color .12s,border-color .12s;display:flex;margin-top:2px}
.aoq-crow:hover,.aoq-crow:focus-within,.aoq-crowOn{background:var(--dsw-alias-interactive-bg-hover)}
.aoq-crow:focus-within,.aoq-crowOn{border-color:var(--dsw-alias-border-l2)}
.aoq-cbEdit{color:var(--dsw-alias-label-secondary);font-size:13px}
.aoq-cinput{flex:1;min-width:0;background:transparent;border:none;outline:none;color:inherit;
  font:inherit;font-size:14px;line-height:24px;padding:0}
.aoq-cinput::placeholder{color:var(--dsw-alias-label-secondary);opacity:.85}
.aoq-cinput:disabled{cursor:default}
.aoq-supplement{padding:10px 0 12px;border-top:1px solid var(--dsw-alias-border-l1)}
.aoq-addbtn{background:none;border:none;cursor:pointer;color:var(--dsw-alias-label-secondary);
  font:inherit;font-size:12px;padding:4px 0;border-radius:6px}
.aoq-addbtn:hover:enabled{color:var(--dsw-alias-label-primary)}
.aoq-addbtn:disabled{opacity:.5;cursor:default}
.aoq-foot{flex-shrink:0;display:flex;align-items:center;gap:12px;
  padding:10px 16px;border-top:1px solid var(--dsw-alias-border-l1)}
.aoq-error{margin-right:auto;color:var(--dsw-alias-state-error-primary);font-size:12px}
.aoq-hint{margin-right:auto;color:var(--dsw-alias-label-secondary);font-size:12px}
.aoq-submit{flex-shrink:0;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
  height:36px;padding:0 14px;border:none;border-radius:var(--dsw-radius-md,8px);
  background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));
  color:var(--dsw-alias-label-primary-foreground,#fff);font:inherit;font-size:14px;line-height:22px;
  font-weight:500;cursor:pointer}
.aoq-submit:hover:enabled{background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
.aoq-submit:disabled{opacity:.4;cursor:not-allowed}
`;

    // ---------------------------------------------------------------------------
    // Recognition — the carrier contract this bundle renders.
    //
    // This bundle claims every generic question card (its own open questions AND
    // the shipped choice questions, so both gain the supplementary-note area).
    // Plan reviews stay with the shipped presentation, and a card with a live
    // countdown (a timed ask under a timed preset) falls back to the shipped
    // composer, which owns the ticking UX.
    // ---------------------------------------------------------------------------
    function claimCarrier(pendingInteraction) {
      if (!pendingInteraction || typeof pendingInteraction !== 'object') return null;
      if (pendingInteraction.kind !== 'question') return null;
      const questions = pendingInteraction.questions;
      if (!Array.isArray(questions) || questions.length === 0) return null;
      if (!questions.every((q) => Boolean(q) && typeof q === 'object'
        && typeof q.id === 'string' && typeof q.question === 'string')) return null;
      if (typeof pendingInteraction.answer !== 'function'
        || typeof pendingInteraction.dismiss !== 'function'
        || typeof pendingInteraction.getSnapshot !== 'function'
        || typeof pendingInteraction.subscribe !== 'function') return null;
      try {
        const snap = pendingInteraction.getSnapshot();
        if (snap && snap.countdown !== undefined) return null;
      } catch {
        return null;
      }
      return pendingInteraction;
    }

    /** Split the conventional recommendation suffix without changing the answer value. */
    function parseRecommendedLabel(label) {
      const suffix = /\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i;
      return suffix.test(label)
        ? { label: label.replace(suffix, ''), recommended: true }
        : { label, recommended: false };
    }

    const hasOptions = (q) => Array.isArray(q.options) && q.options.length > 0;

    /** Empty answer state for one question. */
    const blankValue = () => ({ selected: [], custom: '' });

    /** Whether one question counts as answered under its own shape. */
    function isAnswered(question, value) {
      const v = value || blankValue();
      if (!hasOptions(question)) return v.custom.trim() !== '';
      return v.selected.length > 0 || v.custom.trim() !== '';
    }

    /** One answer item in the wire batch, following the shipped composer's semantics. */
    function toAnswerItem(question, value) {
      const v = value || blankValue();
      const custom = v.custom.trim();
      if (!hasOptions(question)) {
        return custom === '' ? { id: question.id, selected: [] } : { id: question.id, selected: [], custom };
      }
      if (question.multiSelect === true) {
        return custom === ''
          ? { id: question.id, selected: v.selected }
          : { id: question.id, selected: v.selected, custom };
      }
      // A single-select custom answer is exclusive, exactly as the shipped card submits.
      return custom === ''
        ? { id: question.id, selected: v.selected }
        : { id: question.id, selected: [], custom };
    }

    // ---------------------------------------------------------------------------
    // Unified question card
    // ---------------------------------------------------------------------------
    function OpenQuestionsForm(props) {
      const card = props.matched;
      const snap = React.useSyncExternalStore(card.subscribe, card.getSnapshot);
      const questions = card.questions;
      const review = card.review; // recorded answers on a settled call → read-only
      const [values, setValues] = React.useState({});
      const [supplement, setSupplement] = React.useState('');
      const [supplementOpen, setSupplementOpen] = React.useState(false);
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      const readOnly = review !== undefined;
      // Batch-level context: the Host half rides it on the first question's
      // service object; lift it back out and render it above the questions.
      const contextText = typeof questions[0]?.context === 'string' ? questions[0].context : '';
      const contextBlock = contextText === '' ? null : h('div', { className: 'aoq-context', key: 'context' },
        h('div', { className: 'aoq-qheader' }, T.contextLabel),
        h('div', { className: 'aoq-answer' }, contextText));
      const answerable = !readOnly && snap.channel !== 'none' && !snap.closed;
      const locked = !answerable || busy;
      // A required question left empty keeps the submit action disabled, the
      // same posture the shipped composer takes for an unanswered question.
      const missingRequired = !readOnly
        && questions.some((q) => q.required === true && !isAnswered(q, values[q.id]));

      const setValue = (id, patch) => setValues((prev) => ({
        ...prev,
        [id]: { ...blankValue(), ...prev[id], ...patch },
      }));

      const toggleOption = (question, label) => setValues((prev) => {
        const cur = prev[question.id] || blankValue();
        const selected = question.multiSelect === true
          ? (cur.selected.includes(label)
            ? cur.selected.filter((item) => item !== label)
            : [...cur.selected, label])
          : [label];
        return { ...prev, [question.id]: { ...cur, selected } };
      });

      const submit = async () => {
        if (locked || missingRequired) return;
        const missing = questions.find((q) => q.required === true && !isAnswered(q, values[q.id]));
        if (missing !== undefined) { setError(T.errorRequired); return; }
        setBusy(true);
        setError('');
        try {
          const note = supplement.trim();
          await card.answer({
            answers: [
              ...questions.map((q) => toAnswerItem(q, values[q.id])),
              ...(note === '' ? [] : [{ id: SUPPLEMENT_ID, selected: [], custom: note }]),
            ],
          });
        } catch (e) {
          setError(e instanceof Error && e.message ? e.message : T.errorSubmit);
        } finally {
          setBusy(false);
        }
      };

      // ---- read-only review body --------------------------------------------
      const reviewBody = () => {
        const note = review.find((a) => a && a.id === SUPPLEMENT_ID);
        const rows = questions.map((q) => {
          const record = review.find((a) => a && a.id === q.id);
          const labels = record ? record.selected : [];
          const custom = record && typeof record.custom === 'string' ? record.custom : '';
          const skipped = !record || (labels.length === 0 && custom === '');
          return h('div', { className: 'aoq-q', key: q.id },
            q.header ? h('div', { className: 'aoq-qheader' }, q.header) : null,
            h('div', { className: 'aoq-qtext' }, q.question),
            skipped
              ? h('div', { className: 'aoq-skipnote' }, T.skipped)
              : h('div', { className: 'aoq-answer' },
                labels.map((label, index) => h('div', { key: `${label}-${index}` }, label)),
                custom !== '' && (labels.length > 0
                  ? h('div', { key: 'custom', style: { whiteSpace: 'pre-wrap' } }, custom)
                  : custom)));
        });
        return note !== undefined && typeof note.custom === 'string' && note.custom !== ''
          ? [...rows, h('div', { className: 'aoq-supplement', key: 'note' },
            h('div', { className: 'aoq-qheader' }, T.supplementTitle),
            h('div', { className: 'aoq-answer' }, note.custom))]
          : rows;
      };

      // ---- answerable body ----------------------------------------------------
      const answerBody = () => questions.map((q) => {
        const v = values[q.id] || blankValue();
        let input;
        if (hasOptions(q)) {
          input = h('div', { className: 'aoq-options', role: q.multiSelect === true ? 'group' : 'radiogroup' },
            q.options.map((option, index) => {
              const display = parseRecommendedLabel(option.label);
              const selected = v.selected.includes(option.label);
              return h('button', {
                type: 'button',
                key: `${option.label}-${index}`,
                className: selected ? 'aoq-option aoq-optionSel' : 'aoq-option',
                role: q.multiSelect === true ? 'checkbox' : 'radio',
                'aria-checked': selected,
                'aria-label': display.label,
                disabled: locked,
                onClick: () => toggleOption(q, option.label),
              },
              q.multiSelect === true
                ? h('span', { className: selected ? 'aoq-cb aoq-cbOn' : 'aoq-cb' },
                  selected ? h('span', null, '✓') : null)
                : h('span', { className: 'aoq-num' }, index + 1),
              h('span', { className: 'aoq-optCopy' },
                h('span', { className: 'aoq-optLine' },
                  h('span', { className: 'aoq-optLabel' }, display.label),
                  display.recommended ? h('span', { className: 'aoq-badge' }, T.recommended) : null,
                  option.description ? h('span', { className: 'aoq-optDesc' }, option.description) : null)));
            }),
            h('div', { className: v.custom !== '' ? 'aoq-crow aoq-crowOn' : 'aoq-crow' },
              h('span', { className: 'aoq-cb aoq-cbEdit', 'aria-hidden': true }, '✎'),
              h('input', {
                className: 'aoq-cinput',
                value: v.custom,
                placeholder: T.customPlaceholder,
                disabled: locked,
                'aria-label': q.question,
                onChange: (e) => setValue(q.id, { custom: e.target.value }),
                onKeyDown: (e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
                },
              })));
        } else {
          input = h('textarea', {
            className: 'aoq-textarea',
            value: v.custom,
            placeholder: q.placeholder || T.fallbackPlaceholder,
            disabled: locked,
            'aria-label': q.question,
            onChange: (e) => setValue(q.id, { custom: e.target.value }),
            onKeyDown: (e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
            },
          });
        }
        return h('div', { className: 'aoq-q', key: q.id },
          q.header ? h('div', { className: 'aoq-qheader' }, q.header) : null,
          h('div', { className: 'aoq-qtext' },
            q.question,
            q.required === true ? h('span', { className: 'aoq-req', title: T.required }, T.required) : null),
          input);
      });

      const supplementArea = readOnly
        ? null
        : h('div', { className: 'aoq-supplement' },
          supplementOpen || supplement !== ''
            ? h(React.Fragment, null,
              h('div', { className: 'aoq-qheader' }, T.supplementTitle),
              h('textarea', {
                className: 'aoq-textarea',
                value: supplement,
                placeholder: T.supplementPlaceholder,
                disabled: locked,
                onChange: (e) => setSupplement(e.target.value),
                onKeyDown: (e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
                },
              }))
            : h('button', {
              type: 'button',
              className: 'aoq-addbtn',
              disabled: locked,
              onClick: () => setSupplementOpen(true),
            }, `＋ ${T.supplementAdd}`));

      return h(React.Fragment, null,
        h('style', null, CSS),
        h('div', { className: 'aoq-frame' },
          h('div', { className: 'aoq-card', role: 'form', 'aria-label': T.title },
            h('div', { className: 'aoq-head' },
              h('div', { className: 'aoq-title' },
                `${T.title} · ${questions.length}${readOnly ? ` · ${T.answeredTag}` : ''}`),
              h('button', {
                className: 'aoq-close',
                'aria-label': T.close,
                title: T.close,
                onClick: () => { Promise.resolve(card.dismiss()).catch(() => {}); },
              }, '✕')),
            h('div', { className: 'aoq-body' },
              contextBlock,
              readOnly ? reviewBody() : answerBody(),
              supplementArea),
            readOnly
              ? null
              : h('div', { className: 'aoq-foot' },
                error
                  ? h('div', { className: 'aoq-error', role: 'alert' }, error)
                  : missingRequired
                    ? h('div', { className: 'aoq-hint' }, T.errorRequired)
                    : null,
                h('button', {
                  className: 'aoq-submit',
                  disabled: locked || missingRequired,
                  onClick: submit,
                }, busy ? T.submitting : T.submit)))));
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // Register into the composer chain ahead of the shipped question card
        // (priority below 0 tries first). A null select falls through to the
        // stock composer, so plan reviews and timed countdown cards keep the
        // shipped presentation.
        ctx.slots.inject('conversation.composer', () => ctx.slots.register({
          name: 'conversation.composer',
          priority: -10,
          select: ({ pendingInteraction }) => claimCarrier(pendingInteraction) ? pendingInteraction : null,
        }, OpenQuestionsForm));
      },
    };
  },
});
