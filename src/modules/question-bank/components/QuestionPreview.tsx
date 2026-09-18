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
        }),
      }}
    />
  );
}

function balancedBlock(source: string, command: string): string {
  const marker = new RegExp(`\\\\${command}(?:\\[[^\\]]*\\])?\\s*\\{`, 'g');
  const match = marker.exec(source);
  if (!match) return '';
  const contentStart = match.index + match[0].length;
  let depth = 0;
  for (let index = contentStart; index < source.length; index += 1) {
    if (source[index] === '{' && source[index - 1] !== '\\') depth += 1;
    if (source[index] === '}' && source[index - 1] !== '\\') {
      if (depth === 0) return source.slice(contentStart, index).trim();
      depth -= 1;
    }
  }
  return '';
}

function choiceGroups(source: string): Array<{ value: string; correct: boolean }> {
  const marker = /\\choice(?:TF)?\b/.exec(source);
  if (!marker) return [];
  let cursor = marker.index + marker[0].length;
  const groups: Array<{ value: string; correct: boolean }> = [];
  while (cursor < source.length && groups.length < 8) {
    while (/\s/.test(source[cursor] ?? '')) cursor += 1;
    if (source[cursor] !== '{') break;
    const start = cursor + 1;
    let depth = 0;
    cursor += 1;
    for (; cursor < source.length; cursor += 1) {
      if (source[cursor] === '{' && source[cursor - 1] !== '\\') depth += 1;
      if (source[cursor] === '}' && source[cursor - 1] !== '\\') {
        if (depth === 0) {
          const raw = source.slice(start, cursor).trim();
          groups.push({
            value: raw.replace(/\\True\b/g, '').trim(),
            correct: /\\True\b/.test(raw),
          });
          cursor += 1;
          break;
        }
        depth -= 1;
      }
    }
  }
  return groups;
}

function cleanText(value: string): string {
  return value
    .replace(/^\s*%.*$/gm, '')
    .replace(/\\begin\{ex\}(?:\[[^\]]*\])?/g, '')
    .replace(/\\end\{ex\}/g, '')
    .replace(/\\(?:textbf|textit|emph)\{([^{}]*)\}/g, '$1')
    .replace(/\\par\b/g, '\n')
    .replace(/\\\\(?![a-zA-Z])/g, '\n')
    .trim();
}

function richText(value: string): ReactNode[] {
  const parts = cleanText(value).split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\[[\s\S]*?\\\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$'))
      return <Math key={index} value={part.slice(2, -2)} display />;
    if (part.startsWith('\\[') && part.endsWith('\\]'))
      return <Math key={index} value={part.slice(2, -2)} display />;
    if (part.startsWith('$') && part.endsWith('$'))
      return <Math key={index} value={part.slice(1, -1)} display={false} />;
    return <span key={index}>{part}</span>;
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
  const choices = choiceGroups(source);
  const commandStart = source.search(
    /\\choice(?:TF)?\b|\\shortans(?:\[[^\]]*\])?\s*\{|\\loigiai\s*\{/,
  );
  const questionSource = commandStart >= 0 ? source.slice(0, commandStart) : source;
  const detectedAnswer = answer || balancedBlock(source, 'shortans');
  const detectedSolution = solution || balancedBlock(source, 'loigiai');
  const cleanQuestion = cleanText(questionSource);

  return (
    <div className="qb-preview">
      {cleanQuestion ? (
        <div className="qb-preview-question">{richText(questionSource)}</div>
      ) : (
        <span className="muted">Chưa có nội dung để xem trước.</span>
      )}
      {choices.length > 0 && (
        <div className="qb-preview-choices">
          {choices.map((choice, index) => (
            <div key={index} className={`qb-preview-choice ${choice.correct ? 'correct' : ''}`}>
              <b>{String.fromCharCode(65 + index)}.</b> {richText(choice.value)}
            </div>
          ))}
        </div>
      )}
      {detectedAnswer && <div className="qb-preview-answer">Đáp án: {detectedAnswer}</div>}
      {detectedSolution && (
        <div className="qb-preview-solution">
          <h3>Lời giải</h3>
          <div className="qb-preview-question">{richText(detectedSolution)}</div>
        </div>
      )}
    </div>
  );
}
