import katex from 'katex';
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

export function QuestionPreview({ source }: { source: string }) {
  const clean = source
    .replace(/\\begin\{ex\}(?:\[[^\]]*\])?/g, '')
    .replace(/\\end\{ex\}/g, '')
    .replace(/\\loigiai\{[\s\S]*$/g, '')
    .replace(/\\choiceTF|\\choice|\\shortans(?:\[[^\]]*\])?\{[^}]*\}/g, '')
    .trim();
  const parts = clean.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\[[\s\S]*?\\\])/g);
  return (
    <div className="qb-preview">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$'))
          return <Math key={index} value={part.slice(2, -2)} display />;
        if (part.startsWith('\\[') && part.endsWith('\\]'))
          return <Math key={index} value={part.slice(2, -2)} display />;
        if (part.startsWith('$') && part.endsWith('$'))
          return <Math key={index} value={part.slice(1, -1)} display={false} />;
        return <span key={index}>{part}</span>;
      })}
      {!clean && <span className="muted">Chưa có nội dung để xem trước.</span>}
    </div>
  );
}
