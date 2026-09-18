import { commandBlock, maskComments, parseChoices } from '../domain/latex';
import katex from 'katex';
import type { ReactNode } from 'react';
import 'katex/dist/katex.min.css';

function Math({ value, display }: { value: string; display: boolean }) {
  return (
    <span
      className={display ? 'qb-math display' : 'qb-math'}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value, {
          displayMode: display,
          throwOnError: false,
          trust: false,
          strict: 'ignore',
          output: 'htmlAndMathml',
          macros: {
            '\\heva': '\\left\\{\\begin{aligned}#1\\end{aligned}\\right.',
            '\\hoac': '\\left[\\begin{aligned}#1\\end{aligned}\\right.',
          },
        }),
      }}
    />
  );
}

function cleanText(value: string): string {
  return maskComments(value)
    .replace(/^\s*%.*$/gm, '')
    .replace(/\\begin\{ex\}(?:\[[^\]]*\])?/g, '')
    .replace(/\\end\{ex\}/g, '')
    .replace(/\\(?:textbf|textit|emph)\{([^{}]*)\}/g, '$1')
    .replace(/\\par\b/g, '\n')
    .replace(/\\\\(?![a-zA-Z])/g, '\n')
    .trim();
}

function richText(value: string): ReactNode[] {
  const parts = maskComments(value)
    .replace(/\\begin\{ex\}(?:\[[^\]]*\])?/g, '')
    .replace(/\\end\{ex\}/g, '')
    .split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\[[\s\S]*?\\\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$'))
      return <Math key={index} value={part.slice(2, -2)} display />;
    if (part.startsWith('\\[') && part.endsWith('\\]'))
      return <Math key={index} value={part.slice(2, -2)} display />;
    if (part.startsWith('$') && part.endsWith('$'))
      return <Math key={index} value={part.slice(1, -1)} display={false} />;
    return (
      <span key={index}>
        {part.replace(/\\(?:textbf|textit|emph)\{([^{}]*)\}/g, '$1').replace(/\\par\b/g, '\n')}
      </span>
    );
  });
}

export function QuestionPreview({
  source,
  answer = '',
  solution = '',
}: {
  source: string;
  answer?: string;
  solution?: string;
}) {
  const choices = parseChoices(source);
  const commandStart = maskComments(source).search(
    /\\choice(?:TF)?\b|\\shortans(?:\[[^\]]*\])?\s*\{|\\loigiai\s*\{/,
  );
  const questionSource = commandStart >= 0 ? source.slice(0, commandStart) : source;
  const detectedAnswer = answer || commandBlock(source, 'shortans');
  const detectedSolution = solution || commandBlock(source, 'loigiai');
  const cleanQuestion = cleanText(questionSource);

  return (
    <div className="qb-preview">
      {/\\includegraphics|\\begin\{(?:tikzpicture|axis)\}/.test(maskComments(source)) && (
        <p className="muted">
          Câu có hình: khung này chưa biên dịch TikZ hoặc nạp ảnh ngoài. Hãy kiểm tra hình khi xuất
          và biên dịch LaTeX.
        </p>
      )}
      {cleanQuestion ? (
        <div className="qb-preview-question">{richText(questionSource)}</div>
      ) : (
        <span className="muted">Chưa có nội dung để xem trước.</span>
      )}
      {choices.length > 0 && (
        <div className="qb-preview-choices">
          {choices.map((choice, index) => (
            <div key={index} className={`qb-preview-choice ${choice.correct ? 'correct' : ''}`}>
              <b>
                {/\\choiceTF\b/.test(maskComments(source))
                  ? `${String.fromCharCode(97 + index)})`
                  : `${String.fromCharCode(65 + index)}.`}
              </b>{' '}
              {richText(choice.value)}
            </div>
          ))}
        </div>
      )}
      {detectedAnswer && (
        <div className="qb-preview-answer">Đáp án: {richText(detectedAnswer)}</div>
      )}
      {detectedSolution && (
        <div className="qb-preview-solution">
          <h3>Lời giải</h3>
          <div className="qb-preview-question">{richText(detectedSolution)}</div>
        </div>
      )}
    </div>
  );
}
