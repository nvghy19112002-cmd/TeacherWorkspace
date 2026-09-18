import { createElement } from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuestionPreview } from '../src/modules/question-bank/components/QuestionPreview';

it('keeps aligned math row breaks and renders heva without KaTeX errors', () => {
  const html = renderToStaticMarkup(
    createElement(QuestionPreview, {
      source: String.raw`\begin{ex}Tìm $\heva{&x=1\\&y=2}$\choiceTF[1t]{\True A}{B}{C}{D}\end{ex}`,
    }),
  );
  expect(html).not.toContain('katex-error');
  expect(html).toContain('katex-mathml');
  expect(html.match(/class="qb-preview-choice /g)).toHaveLength(4);
  expect(html).toContain('a)');
});
